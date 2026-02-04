-- Add DELETE policy for conversations - allow admins to delete any conversation
CREATE POLICY "Admins can delete any conversation"
ON public.conversations
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Add DELETE policy for messages - allow admins to delete any message
CREATE POLICY "Admins can delete any message"
ON public.messages
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Also add SELECT policies for admins to view all conversations and messages (for moderation)
CREATE POLICY "Admins can view all conversations"
ON public.conversations
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all messages"
ON public.messages
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));