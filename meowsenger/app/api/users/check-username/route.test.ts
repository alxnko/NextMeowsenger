import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

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

// Mock prisma client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock auth
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

describe('GET /api/users/check-username', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 if username is missing', async () => {
    const request = new Request('http://localhost/api/users/check-username');
    vi.mocked(getSession).mockResolvedValue(null);

    const response = await GET(request);

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Username required" },
      { status: 400 }
    );
  });

  it('should return 200 with available: false if username is too short', async () => {
    const request = new Request('http://localhost/api/users/check-username?username=ab');
    vi.mocked(getSession).mockResolvedValue(null);

    const response = await GET(request);

    expect(NextResponse.json).toHaveBeenCalledWith(
      { available: false, error: "Username must be 3-20 characters long and contain only letters, numbers, and underscores." },
      { status: 200 }
    );
  });

  it('should return available: true if username does not exist', async () => {
    const request = new Request('http://localhost/api/users/check-username?username=newuser');
    
    vi.mocked(getSession).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const response = await GET(request);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { username: 'newuser' },
      select: { id: true },
    });
    expect(NextResponse.json).toHaveBeenCalledWith({ available: true, username: 'newuser' });
  });

  it('should return available: false if username exists and belongs to another user', async () => {
    const request = new Request('http://localhost/api/users/check-username?username=existinguser');

    vi.mocked(getSession).mockResolvedValue({ id: 'current-user-id' } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'other-user-id' } as any);

    const response = await GET(request);

    expect(NextResponse.json).toHaveBeenCalledWith({ available: false, username: 'existinguser' });
  });

  it('should return available: true if username exists but belongs to current user', async () => {
    const request = new Request('http://localhost/api/users/check-username?username=myusername');

    vi.mocked(getSession).mockResolvedValue({ id: 'my-user-id' } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'my-user-id' } as any);

    const response = await GET(request);

    expect(NextResponse.json).toHaveBeenCalledWith({ available: true, username: 'myusername' });
  });

  it('should return 500 if database query fails', async () => {
    const request = new Request('http://localhost/api/users/check-username?username=erroruser');

    vi.mocked(getSession).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('DB Error'));

    // Silence console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await GET(request);

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Failed to check username" },
      { status: 500 }
    );

    consoleSpy.mockRestore();
  });
});
