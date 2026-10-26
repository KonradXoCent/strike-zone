CREATE INDEX sz_core_map_history_updated_by_idx ON public.sz_core_map_history USING btree (updated_by);
CREATE INDEX sz_core_maps_updated_by_idx ON public.sz_core_maps USING btree (updated_by);
