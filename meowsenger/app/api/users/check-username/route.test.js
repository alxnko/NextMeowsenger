/**
 * @jest-environment node
 */
const fs = require('fs');
const path = require('path');

// Setup temporary file paths
// We need to transform the TypeScript file to CommonJS to run it in Jest
// because the environment lacks ts-jest or babel-preset-typescript support.
const originalPath = path.join(__dirname, 'route.ts');
const tempPath = path.join(__dirname, 'route.temp.js');

// Helper to transform TS to CJS
function transformTsToCjs() {
  let content = fs.readFileSync(originalPath, 'utf8');

  // Remove types
  // This is a simple regex-based stripper. It might need adjustment if complex types are added.
  content = content.replace(/: Request/g, '');

  // Transform imports
  // Handle 'import { X } from "Y"' -> 'const { X } = require("Y")'
  content = content.replace(/import \{ (.*) \} from "(.*)";/g, 'const { $1 } = require("$2");');

  // Transform export
  // Handle 'export async function GET' -> 'const GET = async function ... module.exports = { GET }'
  content = content.replace(/export async function GET/g, 'const GET = async function');
  content += '\nmodule.exports = { GET };';

  fs.writeFileSync(tempPath, content);
}

// Clean up before execution to ensure clean state
if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

// Mock dependencies
const mockJson = jest.fn();

// Mock next/server
jest.mock('next/server', () => ({
  NextResponse: {
    json: mockJson,
  },
}), { virtual: true }); // virtual: true allows mocking modules that might not be resolvable

const mockFindUnique = jest.fn();

// Mock prisma client
// We mock the path alias directly to avoid module resolution errors
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
    },
  },
}), { virtual: true });

describe('GET /api/users/check-username', () => {
  let GET;

  beforeAll(() => {
    // create the temp JS file
    transformTsToCjs();

    // Invalidate require cache to ensure we load the fresh file
    if (require.cache[tempPath]) {
      delete require.cache[tempPath];
    }

    // Require the transformed file
    const module = require('./route.temp.js');
    GET = module.GET;
  });

  afterAll(() => {
    // Cleanup temporary file
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if username is missing', async () => {
    const req = {
      url: 'http://localhost/api/users/check-username',
      headers: { get: jest.fn() },
    };

    await GET(req);

    expect(mockJson).toHaveBeenCalledWith({ error: "Username required" }, { status: 400 });
  });

  it('should return 200 with available: false if username is too short', async () => {
    const req = {
      url: 'http://localhost/api/users/check-username?username=ab',
      headers: { get: jest.fn() },
    };

    await GET(req);

    expect(mockJson).toHaveBeenCalledWith(
      { available: false, error: "Username must be at least 3 characters" },
      { status: 200 }
    );
  });

  it('should return available: true if username does not exist', async () => {
    const req = {
      url: 'http://localhost/api/users/check-username?username=newuser',
      headers: { get: jest.fn() },
    };

    mockFindUnique.mockResolvedValue(null);

    await GET(req);

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { username: 'newuser' },
      select: { id: true },
    });
    expect(mockJson).toHaveBeenCalledWith({ available: true, username: 'newuser' });
  });

  it('should return available: false if username exists and belongs to another user', async () => {
    const req = {
      url: 'http://localhost/api/users/check-username?username=existinguser',
      headers: { get: jest.fn().mockReturnValue('current-user-id') },
    };

    mockFindUnique.mockResolvedValue({ id: 'other-user-id' });

    await GET(req);

    expect(mockJson).toHaveBeenCalledWith({ available: false, username: 'existinguser' });
  });

  it('should return available: true if username exists but belongs to current user', async () => {
    const req = {
      url: 'http://localhost/api/users/check-username?username=myusername',
      headers: { get: jest.fn().mockReturnValue('my-user-id') },
    };

    mockFindUnique.mockResolvedValue({ id: 'my-user-id' });

    await GET(req);

    expect(mockJson).toHaveBeenCalledWith({ available: true, username: 'myusername' });
  });

  it('should return 500 if database query fails', async () => {
    const req = {
      url: 'http://localhost/api/users/check-username?username=erroruser',
      headers: { get: jest.fn() },
    };

    mockFindUnique.mockRejectedValue(new Error('DB Error'));

    // Silence console.error for this test
    const originalConsoleError = console.error;
    console.error = jest.fn();

    await GET(req);

    expect(mockJson).toHaveBeenCalledWith(
      { error: "Failed to check username" },
      { status: 500 }
    );

    console.error = originalConsoleError;
  });
});
