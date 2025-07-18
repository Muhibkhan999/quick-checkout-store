import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import ChatSystem from '@/components/ChatSystem';

interface Conversation {
  user_id: string;
  user_name: string;
  user_role: 'buyer' | 'seller';
  last_message: string;
  last_message_time: string;
  unread_count: number;
  product_id?: string;
  product_name?: string;
}

const Messages = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;

    try {
      // Get all messages where user is sender or receiver
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get unique user IDs to fetch profiles
      const userIds = new Set<string>();
      messages?.forEach(msg => {
        userIds.add(msg.sender_id);
        userIds.add(msg.receiver_id);
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, role')
        .in('user_id', Array.from(userIds));

      const profileMap = new Map();
      profiles?.forEach(p => profileMap.set(p.user_id, p));

      // Group by conversation partner
      const conversationMap = new Map<string, Conversation>();

      messages?.forEach((message) => {
        const isReceived = message.receiver_id === user.id;
        const partnerId = isReceived ? message.sender_id : message.receiver_id;
        const partner = profileMap.get(partnerId);

        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, {
            user_id: partnerId,
            user_name: partner.full_name || 'Unknown User',
            user_role: partner.role,
            last_message: message.content,
            last_message_time: message.created_at,
            unread_count: 0,
            product_id: message.product_id,
            product_name: undefined
          });
        }

        // Count unread messages (messages received by current user that are not read)
        if (isReceived && !message.read) {
          const existing = conversationMap.get(partnerId)!;
          existing.unread_count += 1;
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    }

    return date.toLocaleDateString();
  };

  if (!user) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Please log in to view messages</h2>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground">Your conversations with buyers and sellers</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-lg">Loading conversations...</p>
          </div>
        ) : conversations.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No conversations yet</h3>
              <p className="text-muted-foreground">
                Start chatting with sellers or buyers by visiting product pages
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Conversations List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Conversations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.user_id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedConversation === conversation.user_id
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedConversation(conversation.user_id)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback>
                            <User className="w-5 h-5" />
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-sm truncate">
                              {conversation.user_name}
                            </h4>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {conversation.user_role}
                              </Badge>
                              {conversation.unread_count > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {conversation.unread_count}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {conversation.product_name && (
                            <p className="text-xs text-muted-foreground mb-1">
                              About: {conversation.product_name}
                            </p>
                          )}
                          
                          <p className="text-xs text-muted-foreground truncate">
                            {conversation.last_message}
                          </p>
                          
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTime(conversation.last_message_time)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-2">
              {selectedConversation ? (
                <div className="h-[600px]">
                  <ChatSystem
                    recipientId={selectedConversation}
                    productId={conversations.find(c => c.user_id === selectedConversation)?.product_id}
                    triggerText="Open Chat"
                  />
                </div>
              ) : (
                <Card className="h-[600px] flex items-center justify-center">
                  <CardContent className="text-center">
                    <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
                    <p className="text-muted-foreground">
                      Choose a conversation from the list to start chatting
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Messages;