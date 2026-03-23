import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function GET(request: NextRequest) {
  const taskId = request.nextUrl.searchParams.get("task_id");
  if (!taskId)
    return NextResponse.json({ error: "task_id required" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: photos, error } = await supabase
    .from("task_photos")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const photosWithUrls = (photos ?? []).map((photo) => ({
    ...photo,
    url: supabase.storage
      .from("task-photos")
      .getPublicUrl(photo.storage_path).data.publicUrl,
  }));

  return NextResponse.json({ data: photosWithUrls });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const taskId = formData.get("task_id") as string;
  const isCompletionPhoto = formData.get("is_completion_photo") === "true";

  if (!file || !taskId)
    return NextResponse.json(
      { error: "File and task_id are required" },
      { status: 400 }
    );

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, and WebP images are allowed" },
      { status: 400 }
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File size must be 5 MB or less" },
      { status: 400 }
    );
  }

  // Get task to verify membership and get environment_id
  const { data: task } = await supabase
    .from("tasks")
    .select("id, environment_id")
    .eq("id", taskId)
    .single();
  if (!task)
    return NextResponse.json({ error: "Task not found" }, { status: 404 });

  // Check photo count
  const { count } = await supabase
    .from("task_photos")
    .select("id", { count: "exact" })
    .eq("task_id", taskId);
  if (count !== null && count >= 10) {
    return NextResponse.json(
      { error: "Maximum of 10 photos per task" },
      { status: 400 }
    );
  }

  // Upload to Supabase Storage
  const fileExt = file.name.split(".").pop() || "jpg";
  const storagePath = `${task.environment_id}/${taskId}/${crypto.randomUUID()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("task-photos")
    .upload(storagePath, file, { contentType: file.type });

  if (uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 });

  // Insert photo record
  const { data: photo, error: insertError } = await supabase
    .from("task_photos")
    .insert({
      task_id: taskId,
      storage_path: storagePath,
      filename: file.name,
      size_bytes: file.size,
      is_completion_photo: isCompletionPhoto,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (insertError) {
    // Clean up uploaded file
    await supabase.storage.from("task-photos").remove([storagePath]);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ data: photo, error: null });
}
