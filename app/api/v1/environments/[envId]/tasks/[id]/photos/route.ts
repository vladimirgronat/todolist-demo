import { NextRequest } from "next/server";
import { authenticateApiKey, createApiSupabaseClient } from "@/lib/api-auth";
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiBadRequest,
} from "@/lib/api-response";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_PHOTOS_PER_TASK = 10;

type RouteContext = { params: Promise<{ envId: string; id: string }> };

export const GET = async (request: NextRequest, { params }: RouteContext) => {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiUnauthorized();

  const { envId, id: taskId } = await params;
  const supabase = createApiSupabaseClient();

  // Verify environment membership
  const { data: membership } = await supabase
    .from("environment_members")
    .select("role")
    .eq("environment_id", envId)
    .eq("user_id", auth.userId)
    .not("joined_at", "is", null)
    .single();

  if (!membership) return apiForbidden("Not a member of this environment");

  // Verify task belongs to environment
  const { data: task } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", taskId)
    .eq("environment_id", envId)
    .single();

  if (!task) return apiNotFound("Task not found");

  // Fetch photos
  const { data: photos, error } = await supabase
    .from("task_photos")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) return apiBadRequest(error.message);

  // Generate signed URLs
  const photosWithUrls = await Promise.all(
    (photos ?? []).map(async (photo) => {
      const { data: signedUrl } = await supabase.storage
        .from("task-photos")
        .createSignedUrl(photo.storage_path, 3600);
      return { ...photo, url: signedUrl?.signedUrl ?? null };
    })
  );

  return apiSuccess(photosWithUrls);
};

export const POST = async (request: NextRequest, { params }: RouteContext) => {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiUnauthorized();

  const { envId, id: taskId } = await params;
  const supabase = createApiSupabaseClient();

  // Verify environment membership
  const { data: membership } = await supabase
    .from("environment_members")
    .select("role")
    .eq("environment_id", envId)
    .eq("user_id", auth.userId)
    .not("joined_at", "is", null)
    .single();

  if (!membership) return apiForbidden("Not a member of this environment");

  // Verify task belongs to environment
  const { data: task } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", taskId)
    .eq("environment_id", envId)
    .single();

  if (!task) return apiNotFound("Task not found");

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiBadRequest("Invalid multipart form data");
  }

  const file = formData.get("file") as File | null;
  const isCompletionPhoto = formData.get("is_completion_photo") === "true";

  if (!file) return apiBadRequest("file is required");

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return apiBadRequest("Only JPEG, PNG, and WebP images are allowed");
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return apiBadRequest("File size must be 5 MB or less");
  }

  // Check photo count
  const { count } = await supabase
    .from("task_photos")
    .select("id", { count: "exact" })
    .eq("task_id", taskId);

  if (count !== null && count >= MAX_PHOTOS_PER_TASK) {
    return apiBadRequest(`Maximum of ${MAX_PHOTOS_PER_TASK} photos per task`);
  }

  // Upload to Supabase Storage
  const fileExt = MIME_TO_EXT[file.type] || "jpg";
  const storagePath = `${envId}/${taskId}/${crypto.randomUUID()}.${fileExt}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("task-photos")
    .upload(storagePath, buffer, { contentType: file.type });

  if (uploadError) return apiBadRequest(uploadError.message);

  // Insert photo record
  const { data: photo, error: insertError } = await supabase
    .from("task_photos")
    .insert({
      task_id: taskId,
      storage_path: storagePath,
      filename: file.name,
      size_bytes: file.size,
      is_completion_photo: isCompletionPhoto,
      uploaded_by: auth.userId,
    })
    .select()
    .single();

  if (insertError) {
    // Clean up uploaded file on insert failure
    await supabase.storage.from("task-photos").remove([storagePath]);
    return apiBadRequest(insertError.message);
  }

  return apiSuccess(photo, 201);
};
