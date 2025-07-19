import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Send, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  product_id?: string;
  order_id?: string;
}

interface Profile {
  user_id: string;
  full_name: string;
  email: string;
  role: 'buyer' | 'seller';
}

interface ChatSystemProps {
  recipientId: string;
  productId?: string;
  orderId?: string;
  triggerText?: string;
}

const ChatSystem: React.FC<ChatSystemProps> = ({ 
  recipientId, 
  productId, 
  orderId, 
  triggerText = "Chat" 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [recipient, setRecipient] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && user) {
      loadMessages();
      loadRecipientProfile();
      
      // Subscribe to real-time messages
      const channel = supabase
        .channel('chat-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
          },
          (payload) => {
            console.log('New message received via realtime:', payload);
            const newMessage = payload.new as Message;
            // Only add message if it's relevant to this conversation
            if ((newMessage.sender_id === user.id && newMessage.receiver_id === recipientId) ||
                (newMessage.sender_id === recipientId && newMessage.receiver_id === user.id)) {
              setMessages(prev => [...prev, newMessage]);
            }
          }
        )
        .subscribe((status) => {
          console.log('Realtime subscription status:', status);
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen, user, recipientId]);

  const loadRecipientProfile = async () => {
    console.log('Loading recipient profile for:', recipientId);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', recipientId)
      .maybeSingle();

    if (error) {
      console.error('Error loading recipient profile:', error);
    } else {
      console.log('Recipient profile loaded:', data);
      setRecipient(data);
    }
  };

  const loadMessages = async () => {
    if (!user) return;

    console.log('Loading messages between user:', user.id, 'and recipient:', recipientId);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
    } else {
      console.log('Messages loaded:', data?.length || 0, 'messages');
      setMessages(data || []);
      
      // Mark messages as read
      const unreadMessages = data?.filter(msg => 
        msg.receiver_id === user.id && !msg.read
      ) || [];
      
      if (unreadMessages.length > 0) {
        console.log('Marking', unreadMessages.length, 'messages as read');
        await supabase
          .from('messages')
          .update({ read: true })
          .in('id', unreadMessages.map(msg => msg.id));
      }
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    setLoading(true);
    
    try {
      console.log('Sending message:', {
        sender_id: user.id,
        receiver_id: recipientId,
        content: newMessage.trim(),
        product_id: productId,
        order_id: orderId
      });
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: recipientId,
          content: newMessage.trim(),
          product_id: productId,
          order_id: orderId
        })
        .select();

      if (error) {
        console.error('Message insert error:', error);
        throw error;
      }

      console.log('Message inserted successfully:', data);

      setNewMessage('');
      
      toast({
        title: "Message sent",
        description: "Your message has been delivered."
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MessageCircle className="w-4 h-4 mr-2" />
          {triggerText}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Chat with {recipient?.full_name || 'User'}
            {recipient && (
              <Badge variant="secondary">
                {recipient.role}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto space-y-3 p-2 border rounded-lg bg-muted/20">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => {
                const isOwn = message.sender_id === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isOwn && (
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>
                          {recipient?.full_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background border'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                    
                    {isOwn && (
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>You</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form onSubmit={sendMessage} className="flex gap-2 mt-4">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={loading}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={loading || !newMessage.trim()}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatSystem;