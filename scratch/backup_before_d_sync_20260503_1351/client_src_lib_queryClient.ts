import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    let text = "";
    try {
      text = await res.text();
      const data = JSON.parse(text);
      if (data && data.message) {
        errorMessage = data.message;
      } else if (text) {
        errorMessage = text;
      }
    } catch (e) {
      if (text) {
        errorMessage = text;
      }
    }
    throw new Error(errorMessage);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      // Prevent browser from serving a cached response for mutation requests
      "Cache-Control": "no-store",
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const res = await fetch(queryKey.join("/") as string, {
        credentials: "include",
        // Prevent the browser from ever serving a stale cached HTTP response
        cache: "no-store",
        headers: {
          "Cache-Control": "no-store",
          "Pragma": "no-cache",
        },
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,   // Refetch when user switches back to this tab
      refetchOnMount: true,         // Refetch every time a component mounts (page open)
      staleTime: 0,                 // All data is immediately stale — always fetch fresh
      gcTime: 0,                    // Evict cache entries immediately when unused — no stale memory between page navigations
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
