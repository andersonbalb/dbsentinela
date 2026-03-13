-- Create table for Zabbix instances
CREATE TABLE public.zabbix_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  api_user TEXT NOT NULL,
  api_token TEXT NOT NULL,
  version TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  last_sync TIMESTAMP WITH TIME ZONE DEFAULT now(),
  hosts_monitored INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.zabbix_instances ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own zabbix instances"
  ON public.zabbix_instances FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own zabbix instances"
  ON public.zabbix_instances FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own zabbix instances"
  ON public.zabbix_instances FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own zabbix instances"
  ON public.zabbix_instances FOR DELETE USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_zabbix_instances_updated_at
  BEFORE UPDATE ON public.zabbix_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table for sync results/metrics history
CREATE TABLE public.zabbix_host_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID NOT NULL REFERENCES public.zabbix_instances(id) ON DELETE CASCADE,
  host_id TEXT NOT NULL,
  hostname TEXT NOT NULL,
  cpu NUMERIC DEFAULT 0,
  memory NUMERIC DEFAULT 0,
  disk NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'online',
  last_check TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.zabbix_host_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view metrics of their instances"
  ON public.zabbix_host_metrics FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.zabbix_instances
    WHERE zabbix_instances.id = zabbix_host_metrics.instance_id
    AND zabbix_instances.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert metrics for their instances"
  ON public.zabbix_host_metrics FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.zabbix_instances
    WHERE zabbix_instances.id = zabbix_host_metrics.instance_id
    AND zabbix_instances.user_id = auth.uid()
  ));