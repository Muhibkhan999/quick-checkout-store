-- Fix RLS policies for messages so sellers can see messages they receive
-- Currently the policy only allows users to see messages they sent or received
-- But there might be an issue with the policy logic

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view messages they sent or received" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update messages they received" ON public.messages;

-- Create new policies with clearer logic
CREATE POLICY "Users can view messages they are involved in" ON public.messages
FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" ON public.messages
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update messages they received (mark as read)" ON public.messages
FOR UPDATE 
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

-- Ensure the messages table has realtime enabled
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Make sure the messages table is in the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.messages;