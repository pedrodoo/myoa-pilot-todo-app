-- Add status column for Kanban: tasks | to_do | doing | completed
-- Keep is_complete in sync for backward compatibility.

alter table todos
  add column if not exists status text
  check (status is null or status in ('tasks', 'to_do', 'doing', 'completed'));

-- Default for new rows (handled by app; set default for existing rows below)
alter table todos
  alter column status set default 'tasks';

-- Backfill: completed -> 'completed', else -> 'to_do'
update todos
set status = case when is_complete then 'completed' else 'to_do' end
where status is null;

-- Optional: keep is_complete in sync when status changes (so existing reads still work)
create or replace function sync_todo_status_to_complete()
returns trigger as $$
begin
  new.is_complete := (new.status = 'completed');
  return new;
end;
$$ language plpgsql;

drop trigger if exists todos_sync_status_to_complete on todos;
create trigger todos_sync_status_to_complete
  before insert or update of status on todos
  for each row
  execute function sync_todo_status_to_complete();
