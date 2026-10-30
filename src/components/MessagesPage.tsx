import React from 'react';
import { Booking, Message, Shop, User } from '../types/index.js';
import { MessagesWorkspace } from './MessagesWorkspace.js';

interface MessagesPageProps {
  user: User;
  messages: Message[];
  shops: Shop[];
  bookings: Booking[];
  onRefresh: () => void;
  onBackToMarket: () => void;
  initialThreadId?: string | null;
  onInitialThreadConsumed?: () => void;
}

export const MessagesPage: React.FC<MessagesPageProps> = ({
  user,
  messages,
  shops,
  bookings,
  onRefresh,
  onBackToMarket,
  initialThreadId,
  onInitialThreadConsumed,
}) => {
  return (
    <main className="flex-1 w-full px-4 py-6 md:py-8 pb-24 md:pb-10">
      <MessagesWorkspace
        user={user}
        messages={messages}
        shops={shops}
        bookings={bookings}
        onSent={onRefresh}
        variant="standalone"
        onBack={onBackToMarket}
        initialThreadId={initialThreadId}
        onInitialThreadConsumed={onInitialThreadConsumed}
      />
    </main>
  );
};
