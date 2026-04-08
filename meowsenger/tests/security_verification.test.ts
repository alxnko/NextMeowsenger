import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../app/api/chats/[id]/route';
import { NextResponse } from 'next/server';
import { getSession } from '../lib/auth';

// Mock next/server
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({
      data,
      status: init?.status || 200,
      json: async () => data,
    })),
  },
}));

// Mock @/lib/auth
vi.mock('../lib/auth', () => ({
  getSession: vi.fn(),
}));

// Mock @/lib/prisma
vi.mock('../lib/prisma', () => ({
  prisma: {
    chat: {
      findUnique: vi.fn(),
    },
    joinRequest: {
        findFirst: vi.fn(),
    }
  },
}));

describe('Security Verification: Header Injection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 even if x-user-id header is present but session is missing', async () => {
    const request = new Request('http://localhost/api/chats/chat-123', {
      headers: { 'x-user-id': 'attacker-id' }
    });

    // Mock getSession to return null (no valid session cookie)
    vi.mocked(getSession).mockResolvedValue(null);

    const params = Promise.resolve({ id: 'chat-123' });
    const response = await GET(request, { params });

    expect(getSession).toHaveBeenCalled();
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Unauthorized" },
      { status: 401 }
    );
  });

  it('should return 200 if valid session is present (ignoring x-user-id header)', async () => {
    // Attacker tries to spoof as 'victim-id' via header, but has a valid session as 'real-user-id'
    const request = new Request('http://localhost/api/chats/chat-123', {
      headers: { 'x-user-id': 'victim-id' }
    });

    const mockUser = { id: 'real-user-id', username: 'realuser' };
    vi.mocked(getSession).mockResolvedValue(mockUser as any);

    // Mock Prisma to return a public chat so it doesn't fail on membership checks
    const { prisma } = await import('../lib/prisma');
    vi.mocked(prisma.chat.findUnique).mockResolvedValue({
      id: 'chat-123',
      name: 'Public Chat',
      visibility: 'PUBLIC',
      participants: [],
      messages: []
    } as any);

    const params = Promise.resolve({ id: 'chat-123' });
    const response = await GET(request, { params });

    expect(getSession).toHaveBeenCalled();
    // The response data should be based on real-user-id, not victim-id
    // In this specific endpoint, userId is used to check membershipStatus
    const responseData = await response.json();
    expect(responseData.chat.membershipStatus).toBe('NON_MEMBER'); // Because real-user-id is not a participant
  });
});
