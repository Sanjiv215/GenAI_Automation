import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  ApiKey,
  Workflow,
  Run,
  Webhook,
  WebhookDelivery,
  RunStatus,
} from "@/types";
import crypto from "crypto";

const rawUrl = process.env.SUPABASE_URL;
const supabaseUrl = rawUrl?.startsWith("postgres")
  ? process.env.NEXT_PUBLIC_SUPABASE_URL
  : (rawUrl || process.env.NEXT_PUBLIC_SUPABASE_URL);

const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseKey &&
    supabaseUrl.startsWith("http") &&
    !supabaseUrl.includes("your-project-id") &&
    !supabaseKey.includes("your_supabase_service_role_key")
);

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!supabaseInstance && supabaseUrl && supabaseKey) {
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseInstance;
}

// In-Memory Fallback Store (Used when Supabase is not configured or in local sandbox)
class MemoryStore {
  apiKeys: Map<string, ApiKey> = new Map();
  workflows: Map<string, Workflow> = new Map();
  runs: Map<string, Run> = new Map();
  webhooks: Map<string, Webhook> = new Map();
  webhookDeliveries: Map<string, WebhookDelivery> = new Map();

  constructor() {
    // Seed default master dev key for local development
    const defaultRawKey = "wfa_live_00000000000000000000000000000000";
    const defaultHash = crypto.createHash("sha256").update(defaultRawKey).digest("hex");
    const defaultKey: ApiKey = {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Default Admin Key",
      key_prefix: "wfa_live_000000",
      key_hash: defaultHash,
      is_active: true,
      created_at: new Date().toISOString(),
      last_used_at: null,
    };
    this.apiKeys.set(defaultKey.id, defaultKey);
  }
}

const memoryStore = new MemoryStore();

// --- API Keys Repository ---
export const apiKeyRepo = {
  async create(data: { name: string; key_prefix: string; key_hash: string }): Promise<ApiKey> {
    const supabase = getSupabase();
    if (supabase) {
      const { data: inserted, error } = await supabase
        .from("api_keys")
        .insert({
          name: data.name,
          key_prefix: data.key_prefix,
          key_hash: data.key_hash,
          is_active: true,
        })
        .select()
        .single();
      if (error) throw new Error(`Database error: ${error.message}`);
      return inserted as ApiKey;
    }

    const newKey: ApiKey = {
      id: crypto.randomUUID(),
      name: data.name,
      key_prefix: data.key_prefix,
      key_hash: data.key_hash,
      is_active: true,
      created_at: new Date().toISOString(),
      last_used_at: null,
    };
    memoryStore.apiKeys.set(newKey.id, newKey);
    return newKey;
  },

  async findByHash(keyHash: string): Promise<ApiKey | null> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .eq("key_hash", keyHash)
        .single();
      if (error || !data) return null;
      return data as ApiKey;
    }

    for (const key of Array.from(memoryStore.apiKeys.values())) {
      if (key.key_hash === keyHash) return key;
    }
    return null;
  },

  async getById(id: string): Promise<ApiKey | null> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !data) return null;
      return data as ApiKey;
    }
    return memoryStore.apiKeys.get(id) || null;
  },

  async list(): Promise<ApiKey[]> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from("api_keys")
        .select("id, name, key_prefix, is_active, created_at, last_used_at")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data as ApiKey[];
    }
    return Array.from(memoryStore.apiKeys.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async revoke(id: string): Promise<boolean> {
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase
        .from("api_keys")
        .update({ is_active: false })
        .eq("id", id);
      return !error;
    }
    const key = memoryStore.apiKeys.get(id);
    if (!key) return false;
    key.is_active = false;
    return true;
  },

  async updateLastUsed(id: string): Promise<void> {
    const now = new Date().toISOString();
    const supabase = getSupabase();
    if (supabase) {
      await supabase.from("api_keys").update({ last_used_at: now }).eq("id", id);
      return;
    }
    const key = memoryStore.apiKeys.get(id);
    if (key) key.last_used_at = now;
  },
};

// --- Workflows Repository ---
export const workflowRepo = {
  async create(data: Omit<Workflow, "id" | "created_at">): Promise<Workflow> {
    const supabase = getSupabase();
    if (supabase) {
      const { data: inserted, error } = await supabase
        .from("workflows")
        .insert({
          api_key_id: data.api_key_id,
          name: data.name,
          description: data.description,
          prompt: data.prompt,
          steps: data.steps,
        })
        .select()
        .single();
      if (error) throw new Error(`Failed to create workflow: ${error.message}`);
      return inserted as Workflow;
    }

    const workflow: Workflow = {
      id: crypto.randomUUID(),
      ...data,
      created_at: new Date().toISOString(),
    };
    memoryStore.workflows.set(workflow.id, workflow);
    return workflow;
  },

  async list(apiKeyId?: string, limit = 20, offset = 0): Promise<{ data: Workflow[]; total: number }> {
    const supabase = getSupabase();
    if (supabase) {
      let query = supabase
        .from("workflows")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (apiKeyId) {
        query = query.eq("api_key_id", apiKeyId);
      }

      const { data, count, error } = await query;
      if (error) throw new Error(error.message);
      return { data: (data as Workflow[]) || [], total: count || 0 };
    }

    let items = Array.from(memoryStore.workflows.values());
    if (apiKeyId) {
      items = items.filter((w) => w.api_key_id === apiKeyId);
    }
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const total = items.length;
    const paginated = items.slice(offset, offset + limit);
    return { data: paginated, total };
  },

  async getById(id: string, apiKeyId?: string): Promise<Workflow | null> {
    const supabase = getSupabase();
    if (supabase) {
      let query = supabase.from("workflows").select("*").eq("id", id);
      if (apiKeyId) query = query.eq("api_key_id", apiKeyId);
      const { data, error } = await query.single();
      if (error || !data) return null;
      return data as Workflow;
    }

    const wf = memoryStore.workflows.get(id);
    if (!wf) return null;
    if (apiKeyId && wf.api_key_id !== apiKeyId) return null;
    return wf;
  },

  async delete(id: string, apiKeyId?: string): Promise<boolean> {
    const supabase = getSupabase();
    if (supabase) {
      let query = supabase.from("workflows").delete().eq("id", id);
      if (apiKeyId) query = query.eq("api_key_id", apiKeyId);
      const { error } = await query;
      return !error;
    }

    const wf = memoryStore.workflows.get(id);
    if (!wf) return false;
    if (apiKeyId && wf.api_key_id !== apiKeyId) return false;
    memoryStore.workflows.delete(id);
    return true;
  },
};

// --- Runs Repository ---
export const runRepo = {
  async create(data: Omit<Run, "id" | "created_at">): Promise<Run> {
    const supabase = getSupabase();
    if (supabase) {
      const { data: inserted, error } = await supabase
        .from("runs")
        .insert({
          workflow_id: data.workflow_id,
          status: data.status,
          input: data.input,
          step_results: data.step_results,
          output: data.output,
          error: data.error,
          started_at: data.started_at,
          finished_at: data.finished_at,
        })
        .select()
        .single();
      if (error) throw new Error(`Failed to create run: ${error.message}`);
      return inserted as Run;
    }

    const run: Run = {
      id: crypto.randomUUID(),
      ...data,
      created_at: new Date().toISOString(),
    };
    memoryStore.runs.set(run.id, run);
    return run;
  },

  async getById(id: string, apiKeyId?: string): Promise<(Run & { workflow?: Workflow }) | null> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from("runs")
        .select("*, workflow:workflows(*)")
        .eq("id", id)
        .single();
      if (error || !data) return null;
      const run = data as unknown as Run & { workflow?: Workflow };
      if (apiKeyId && run.workflow && run.workflow.api_key_id !== apiKeyId) {
        return null;
      }
      return run;
    }

    const run = memoryStore.runs.get(id);
    if (!run) return null;
    const workflow = memoryStore.workflows.get(run.workflow_id);
    if (apiKeyId && workflow && workflow.api_key_id !== apiKeyId) {
      return null;
    }
    return { ...run, workflow };
  },

  async list(
    apiKeyId?: string,
    status?: string,
    limit = 20,
    offset = 0
  ): Promise<{ data: Run[]; total: number }> {
    const supabase = getSupabase();
    if (supabase) {
      let query = supabase
        .from("runs")
        .select("*, workflow:workflows!inner(api_key_id)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (apiKeyId) {
        query = query.eq("workflow.api_key_id", apiKeyId);
      }
      if (status) {
        query = query.eq("status", status);
      }

      const { data, count, error } = await query;
      if (error) throw new Error(error.message);
      return { data: (data as unknown as Run[]) || [], total: count || 0 };
    }

    let items = Array.from(memoryStore.runs.values());
    if (apiKeyId) {
      items = items.filter((r) => {
        const wf = memoryStore.workflows.get(r.workflow_id);
        return wf && wf.api_key_id === apiKeyId;
      });
    }
    if (status) {
      items = items.filter((r) => r.status === status);
    }
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const total = items.length;
    const paginated = items.slice(offset, offset + limit);
    return { data: paginated, total };
  },

  async update(id: string, updates: Partial<Run>): Promise<Run | null> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from("runs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error || !data) return null;
      return data as Run;
    }

    const run = memoryStore.runs.get(id);
    if (!run) return null;
    const updated = { ...run, ...updates };
    memoryStore.runs.set(id, updated);
    return updated;
  },
};

// --- Webhooks Repository ---
export const webhookRepo = {
  async create(data: Omit<Webhook, "id" | "created_at">): Promise<Webhook> {
    const supabase = getSupabase();
    if (supabase) {
      const { data: inserted, error } = await supabase
        .from("webhooks")
        .insert({
          api_key_id: data.api_key_id,
          url: data.url,
          events: data.events,
          secret: data.secret,
          is_active: true,
        })
        .select()
        .single();
      if (error) throw new Error(`Failed to create webhook: ${error.message}`);
      return inserted as Webhook;
    }

    const webhook: Webhook = {
      id: crypto.randomUUID(),
      ...data,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    memoryStore.webhooks.set(webhook.id, webhook);
    return webhook;
  },

  async list(apiKeyId?: string): Promise<Webhook[]> {
    const supabase = getSupabase();
    if (supabase) {
      let query = supabase
        .from("webhooks")
        .select("*")
        .order("created_at", { ascending: false });
      if (apiKeyId) query = query.eq("api_key_id", apiKeyId);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data as Webhook[]) || [];
    }

    let items = Array.from(memoryStore.webhooks.values());
    if (apiKeyId) items = items.filter((w) => w.api_key_id === apiKeyId);
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getById(id: string, apiKeyId?: string): Promise<Webhook | null> {
    const supabase = getSupabase();
    if (supabase) {
      let query = supabase.from("webhooks").select("*").eq("id", id);
      if (apiKeyId) query = query.eq("api_key_id", apiKeyId);
      const { data, error } = await query.single();
      if (error || !data) return null;
      return data as Webhook;
    }

    const wh = memoryStore.webhooks.get(id);
    if (!wh) return null;
    if (apiKeyId && wh.api_key_id !== apiKeyId) return null;
    return wh;
  },

  async findByEvent(event: string, apiKeyId?: string): Promise<Webhook[]> {
    const supabase = getSupabase();
    if (supabase) {
      let query = supabase
        .from("webhooks")
        .select("*")
        .eq("is_active", true)
        .contains("events", [event]);
      if (apiKeyId) query = query.eq("api_key_id", apiKeyId);
      const { data, error } = await query;
      if (error) return [];
      return (data as Webhook[]) || [];
    }

    return Array.from(memoryStore.webhooks.values()).filter(
      (w) => w.is_active && w.events.includes(event) && (!apiKeyId || w.api_key_id === apiKeyId)
    );
  },

  async delete(id: string, apiKeyId?: string): Promise<boolean> {
    const supabase = getSupabase();
    if (supabase) {
      let query = supabase.from("webhooks").delete().eq("id", id);
      if (apiKeyId) query = query.eq("api_key_id", apiKeyId);
      const { error } = await query;
      return !error;
    }

    const wh = memoryStore.webhooks.get(id);
    if (!wh) return false;
    if (apiKeyId && wh.api_key_id !== apiKeyId) return false;
    memoryStore.webhooks.delete(id);
    return true;
  },
};

// --- Webhook Deliveries Repository ---
export const webhookDeliveryRepo = {
  async create(data: Omit<WebhookDelivery, "id" | "created_at">): Promise<WebhookDelivery> {
    const supabase = getSupabase();
    if (supabase) {
      const { data: inserted, error } = await supabase
        .from("webhook_deliveries")
        .insert({
          webhook_id: data.webhook_id,
          event: data.event,
          payload: data.payload,
          response_status: data.response_status,
          attempt: data.attempt,
          success: data.success,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return inserted as WebhookDelivery;
    }

    const delivery: WebhookDelivery = {
      id: crypto.randomUUID(),
      ...data,
      created_at: new Date().toISOString(),
    };
    memoryStore.webhookDeliveries.set(delivery.id, delivery);
    return delivery;
  },

  async listByWebhook(webhookId: string): Promise<WebhookDelivery[]> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from("webhook_deliveries")
        .select("*")
        .eq("webhook_id", webhookId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data as WebhookDelivery[]) || [];
    }

    return Array.from(memoryStore.webhookDeliveries.values())
      .filter((d) => d.webhook_id === webhookId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async listRecent(limit = 50): Promise<WebhookDelivery[]> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from("webhook_deliveries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data as WebhookDelivery[]) || [];
    }

    return Array.from(memoryStore.webhookDeliveries.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  },
};
