# Directors Palette - Code Patterns

This document describes the established code patterns used throughout the Directors Palette codebase. Follow these patterns when implementing new features.

## Feature Module Structure

All major features follow this directory structure:

```
src/features/[feature-name]/
├── components/           # UI Components (< 70 lines each)
│   ├── ComponentName.tsx
│   └── index.ts          # Barrel exports
├── hooks/                # Custom React hooks
│   ├── useFeatureHook.ts
│   └── index.ts
├── services/             # Business logic & API calls
│   ├── feature.service.ts
│   └── index.ts
├── store/                # Zustand state management
│   ├── feature.store.ts
│   └── index.ts
├── types/                # TypeScript definitions
│   ├── feature.types.ts
│   └── index.ts
├── helpers/              # Utility functions (optional)
│   └── feature.helper.ts
└── index.ts              # Feature barrel export
```

## Component Pattern

Components should be focused on UI, under 70 lines, with logic extracted to hooks:

```tsx
// src/features/example/components/ExampleCard.tsx
'use client';

import { useExample } from '../hooks/useExample';
import { ExampleCardProps } from '../types';
import { Button } from '@/components/ui/button';

export function ExampleCard({ id, onSelect }: ExampleCardProps) {
  const { item, isLoading, handleAction } = useExample(id);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold">{item.title}</h3>
      <p className="text-muted-foreground">{item.description}</p>
      <Button onClick={() => handleAction(item)}>
        Select
      </Button>
    </div>
  );
}
```

## Hook Pattern

Hooks encapsulate React state and side effects:

```tsx
// src/features/example/hooks/useExample.ts
import { useState, useCallback } from 'react';
import { exampleService } from '../services/example.service';
import { Example } from '../types';

export function useExample(id: string) {
  const [item, setItem] = useState<Example | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchItem = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await exampleService.getById(id);
      setItem(data);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const handleAction = useCallback(async (item: Example) => {
    await exampleService.processItem(item);
  }, []);

  return { item, isLoading, fetchItem, handleAction };
}
```

## Service Pattern

Services contain business logic and API calls:

```tsx
// src/features/example/services/example.service.ts
import { createClient } from '@/lib/supabase/client';
import { Example, CreateExampleInput } from '../types';

class ExampleService {
  private supabase = createClient();

  async getById(id: string): Promise<Example | null> {
    const { data, error } = await this.supabase
      .from('examples')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async create(input: CreateExampleInput): Promise<Example> {
    const { data, error } = await this.supabase
      .from('examples')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async processItem(item: Example): Promise<void> {
    // Business logic here
  }
}

export const exampleService = new ExampleService();
```

## Zustand Store Pattern

Stores manage global state with typed actions:

```tsx
// src/features/example/store/example.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Example } from '../types';

interface ExampleState {
  items: Example[];
  selectedId: string | null;

  // Actions
  setItems: (items: Example[]) => void;
  selectItem: (id: string) => void;
  addItem: (item: Example) => void;
  removeItem: (id: string) => void;
}

export const useExampleStore = create<ExampleState>()(
  persist(
    (set) => ({
      items: [],
      selectedId: null,

      setItems: (items) => set({ items }),
      selectItem: (id) => set({ selectedId: id }),
      addItem: (item) => set((state) => ({
        items: [...state.items, item]
      })),
      removeItem: (id) => set((state) => ({
        items: state.items.filter(i => i.id !== id)
      })),
    }),
    { name: 'example-storage' }
  )
);
```

## API Route Pattern

Next.js Route Handlers with proper error handling:

```tsx
// src/app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('examples')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate with Zod schema
    const validated = ExampleSchema.parse(body);

    const { data, error } = await supabase
      .from('examples')
      .insert({ ...validated, user_id: user.id })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Type Definition Pattern

Types with Zod validation schemas:

```tsx
// src/features/example/types/example.types.ts
import { z } from 'zod';

// Zod schema for validation
export const ExampleSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']),
  metadata: z.record(z.unknown()).optional(),
});

// Infer types from schema
export type CreateExampleInput = z.infer<typeof ExampleSchema>;

// Full type with database fields
export interface Example extends CreateExampleInput {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

// Component props
export interface ExampleCardProps {
  id: string;
  onSelect?: (example: Example) => void;
}
```

## UI Component Pattern (shadcn/ui)

Using shadcn/ui components with Radix primitives:

```tsx
// Using Dialog component
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// Using Form with react-hook-form
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';

export function ExampleForm() {
  const form = useForm<CreateExampleInput>({
    resolver: zodResolver(ExampleSchema),
    defaultValues: { title: '', status: 'draft' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
```

## Replicate API Pattern

Generating images/videos with Replicate:

```tsx
// Using the centralized generation endpoint
const response = await fetch('/api/generation/image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'A cinematic shot of...',
    model: 'google/nano-banana-pro',
    aspect_ratio: '16:9',
    reference_image_url: 'optional-url',
  }),
});

const { prediction_id } = await response.json();

// Poll for status
const checkStatus = async (id: string) => {
  const res = await fetch(`/api/generation/status/${id}`);
  return res.json();
};
```

## Import Conventions

```tsx
// 1. React imports
import { useState, useCallback, useEffect } from 'react';

// 2. Next.js imports
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// 3. Third-party imports
import { toast } from 'sonner';
import { z } from 'zod';

// 4. UI components (absolute imports)
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

// 5. Feature imports (relative)
import { useExample } from '../hooks/useExample';
import { exampleService } from '../services/example.service';
import { Example } from '../types';

// 6. Type-only imports
import type { ExampleProps } from '../types';
```

## Error Handling Pattern

```tsx
// In services
async function riskyOperation() {
  try {
    const result = await apiCall();
    return { success: true, data: result };
  } catch (error) {
    console.error('Operation failed:', error);
    return { success: false, error: 'Operation failed' };
  }
}

// In components with toast notifications
import { toast } from 'sonner';

async function handleSubmit() {
  try {
    await service.submit(data);
    toast.success('Saved successfully');
  } catch (error) {
    toast.error('Failed to save');
  }
}
```
