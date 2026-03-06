-- Avatars storage bucket (public read, 2MB limit, images only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

-- Anyone can view avatars
create policy "Public read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Users can manage their own avatar (file name = user id)
create policy "Users upload own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = name);

create policy "Users update own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = name);

create policy "Users delete own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = name);
