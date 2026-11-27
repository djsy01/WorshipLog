SELECT 'songs.sheet_music_url' AS column_name, count(*) AS supabase_urls
  FROM public.songs WHERE sheet_music_url LIKE '%supabase.co/storage/%'
UNION ALL SELECT 'conti_song_sheets.url', count(*)
  FROM public.conti_song_sheets WHERE url LIKE '%supabase.co/storage/%'
UNION ALL SELECT 'messages.file_url', count(*)
  FROM public.messages WHERE file_url LIKE '%supabase.co/storage/%'
UNION ALL SELECT 'posts.file_url', count(*)
  FROM public.posts WHERE file_url LIKE '%supabase.co/storage/%'
UNION ALL SELECT 'users.profile_image_url', count(*)
  FROM public.users WHERE profile_image_url LIKE '%supabase.co/storage/%';
