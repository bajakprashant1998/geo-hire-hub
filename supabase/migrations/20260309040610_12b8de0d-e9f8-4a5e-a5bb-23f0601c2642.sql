CREATE OR REPLACE FUNCTION public.get_unread_message_count(p_user_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)
  FROM public.messages m
  JOIN public.conversations c ON m.conversation_id = c.id
  WHERE (c.participant_1 = p_user_id OR c.participant_2 = p_user_id)
    AND m.is_read = false
    AND m.sender_id != p_user_id;
$$;