import { getParameterHistoryPage } from "@/lib/dashboard";
import { serializeParameterHistoryPage } from "@/lib/dashboardPaginationApi";
import {
  parseParameterHistoryPage,
  parseParameterHistoryPageSize,
} from "@/lib/parameterHistoryPagination";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseParameterHistoryPage(searchParams.get("page") ?? undefined);
  const pageSize = parseParameterHistoryPageSize(searchParams.get("pageSize") ?? undefined);
  const data = await getParameterHistoryPage(page, pageSize);

  return Response.json(serializeParameterHistoryPage(data));
}
