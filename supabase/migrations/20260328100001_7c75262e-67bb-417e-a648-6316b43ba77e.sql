CREATE POLICY "Admins can delete navigator attempts"
ON public.route_navigator_attempts FOR DELETE
TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete finder attempts"
ON public.route_finder_attempts FOR DELETE
TO public USING (has_role(auth.uid(), 'admin'::app_role));