import { getJobMatchesPage } from "@/lib/dashboard";
import { serializeJobMatchesPage } from "@/lib/dashboardPaginationApi";
import {
  parseJobMatchesPage,
  parseJobMatchesPageSize,
} from "@/lib/jobMatchesPagination";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseJobMatchesPage(searchParams.get("page") ?? undefined);
  const pageSize = parseJobMatchesPageSize(searchParams.get("pageSize") ?? undefined);
  const data = await getJobMatchesPage(page, pageSize);

  return Response.json(serializeJobMatchesPage(data));
}
