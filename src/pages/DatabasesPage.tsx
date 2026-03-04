import { useState } from "react";
import { mockDatabases, DatabaseInstance, DatabaseEngine } from "@/data/mockData";
import { Plus, Trash2, Edit2, Server, X, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const engines: DatabaseEngine[] = ["PostgreSQL", "MySQL", "Oracle", "SQL Server", "MongoDB", "MariaDB"];

const emptyDb: Omit<DatabaseInstance, "id" | "status" | "cpu" | "memory" | "connections" | "maxConnections" | "diskUsage" | "iops" | "uptime" | "tps" | "cacheHitRatio"> = {
  name: "",
  host: "",
  port: 5432,
  engine: "PostgreSQL",
  version: "",
};

const DatabasesPage = () => {
  const [databases, setDatabases] = useState<DatabaseInstance[]>(mockDatabases);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyDb);

  const handleSave = () => {
    if (!form.name || !form.host) return;
    if (editId) {
      setDatabases((prev) =>
        prev.map((db) =>
          db.id === editId ? { ...db, ...form } : db
        )
      );
    } else {
      const newDb: DatabaseInstance = {
        ...form,
        id: `db-${Date.now()}`,
        status: "online",
        cpu: 0,
        memory: 0,
        connections: 0,
        maxConnections: 500,
        diskUsage: 0,
        iops: 0,
        uptime: "0d 0h",
        tps: 0,
        cacheHitRatio: 0,
      };
      setDatabases((prev) => [...prev, newDb]);
    }
    resetForm();
  };

  const handleEdit = (db: DatabaseInstance) => {
    setForm({ name: db.name, host: db.host, port: db.port, engine: db.engine, version: db.version });
    setEditId(db.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setDatabases((prev) => prev.filter((d) => d.id !== id));
  };

  const resetForm = () => {
    setForm(emptyDb);
    setEditId(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono neon-text">Bancos de Dados</h1>
          <p className="text-muted-foreground text-sm">Cadastro e gerenciamento de instâncias</p>
        </div>
        <Button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"
        >
          <Plus className="w-4 h-4 mr-2" /> Novo Banco
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass rounded-lg p-5 neon-border animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold font-mono text-sm">{editId ? "Editar" : "Novo"} Banco de Dados</h2>
            <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="prod-master" className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Host</label>
              <Input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="db1.internal.corp" className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Porta</label>
              <Input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) || 0 })} className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Engine</label>
              <select
                value={form.engine}
                onChange={(e) => setForm({ ...form, engine: e.target.value as DatabaseEngine })}
                className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-sm text-foreground"
              >
                {engines.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Versão</label>
              <Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="16.2" className="bg-secondary border-border" />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Save className="w-4 h-4 mr-2" /> {editId ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-border/50 text-xs font-mono text-muted-foreground">
          <div className="col-span-1">Status</div>
          <div className="col-span-2">Nome</div>
          <div className="col-span-3">Host</div>
          <div className="col-span-1">Porta</div>
          <div className="col-span-2">Engine</div>
          <div className="col-span-1">Versão</div>
          <div className="col-span-2 text-right">Ações</div>
        </div>
        {databases.map((db, i) => (
          <div key={db.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-border/30 hover:bg-secondary/30 items-center text-sm animate-slide-up" style={{ animationDelay: `${i * 15}ms` }}>
            <div className="col-span-1">
              <div className={`status-dot-${db.status}`} />
            </div>
            <div className="col-span-2 font-mono text-xs font-semibold">{db.name}</div>
            <div className="col-span-3 font-mono text-xs text-muted-foreground">{db.host}</div>
            <div className="col-span-1 font-mono text-xs">{db.port}</div>
            <div className="col-span-2 text-xs">{db.engine}</div>
            <div className="col-span-1 text-xs text-muted-foreground">{db.version}</div>
            <div className="col-span-2 flex justify-end gap-2">
              <button onClick={() => handleEdit(db)} className="p-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleDelete(db.id)} className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DatabasesPage;
