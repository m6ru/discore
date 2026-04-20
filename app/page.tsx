import { createServerClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createServerClient();

  const { data: courses } = await supabase.from('courses').select('*')

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Discore Courses</h1>
      <pre>{JSON.stringify(courses, null, 2)}</pre>
    </main>
  )
}
