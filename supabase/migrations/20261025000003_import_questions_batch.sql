-- Writes one CSV file's accepted rows in a single transaction.
--
-- A function body runs as one transaction, so any failure (for example a
-- duplicate question_code that slipped past validation) rolls back the whole
-- file. The app validates rows first and rejects bad ones individually. This
-- function never silently skips a row.
--
-- Only server code with the service role may call it, after the server has
-- checked that the caller is an admin with a content or academic sub-role.
create or replace function public.import_questions_batch(p_rows jsonb, p_actor uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r jsonb;
  v_section_id uuid;
  v_topic_id uuid;
  v_status text;
  v_count integer := 0;
begin
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array';
  end if;

  for r in select value from jsonb_array_elements(p_rows) loop
    v_section_id := (r ->> 'section_id')::uuid;
    v_status := coalesce(r ->> 'status', 'draft');
    v_topic_id := null;

    if r ->> 'topic' is not null then
      insert into public.topics (section_id, name)
      values (v_section_id, r ->> 'topic')
      on conflict (section_id, name) do nothing;

      select t.id into v_topic_id
      from public.topics t
      where t.section_id = v_section_id and t.name = r ->> 'topic';
    end if;

    insert into public.questions (
      question_code, exam_id, section_id, topic_id, difficulty, option_count,
      stem, options_json, correct_option, explanation, marks, negative_marks,
      tags, source, status, created_by, reviewed_by
    ) values (
      r ->> 'question_code',
      (r ->> 'exam_id')::uuid,
      v_section_id,
      v_topic_id,
      r ->> 'difficulty',
      (r ->> 'option_count')::integer,
      r ->> 'stem',
      r -> 'options',
      r ->> 'correct_option',
      nullif(r ->> 'explanation', ''),
      (r ->> 'marks')::numeric,
      (r ->> 'negative_marks')::numeric,
      coalesce(array(select jsonb_array_elements_text(r -> 'tags')), '{}'),
      'csv_import',
      v_status,
      p_actor,
      case when v_status = 'draft' then null else p_actor end
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.import_questions_batch(jsonb, uuid) from public, anon, authenticated;
grant execute on function public.import_questions_batch(jsonb, uuid) to service_role;
