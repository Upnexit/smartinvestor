
DO $$
DECLARE
  g RECORD;
  v_keeper uuid;
  v_losers uuid[];
BEGIN
  -- Bypass triggers (daily-quota guard) during cleanup
  SET LOCAL session_replication_role = replica;

  FOR g IN
    SELECT scheduled_date, required_package_id, link_url,
           array_agg(id ORDER BY created_at ASC) AS ids
    FROM public.link_tasks
    WHERE is_draft = false
    GROUP BY scheduled_date, required_package_id, link_url
    HAVING COUNT(*) > 1
  LOOP
    v_keeper := g.ids[1];
    v_losers := g.ids[2:array_length(g.ids,1)];

    DELETE FROM public.task_submissions ts
    WHERE ts.task_id = ANY(v_losers)
      AND EXISTS (
        SELECT 1 FROM public.task_submissions ks
        WHERE ks.task_id = v_keeper AND ks.user_id = ts.user_id
      );

    UPDATE public.task_submissions
      SET task_id = v_keeper
      WHERE task_id = ANY(v_losers);

    DELETE FROM public.link_tasks WHERE id = ANY(v_losers);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS link_tasks_unique_slot_idx
  ON public.link_tasks (scheduled_date, required_package_id, link_url)
  WHERE is_draft = false AND scheduled_date IS NOT NULL AND required_package_id IS NOT NULL;
