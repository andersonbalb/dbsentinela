DROP POLICY IF EXISTS "Users can update their own zabbix instances" ON public.zabbix_instances;

CREATE POLICY "Users can update their own zabbix instances"
ON public.zabbix_instances
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);