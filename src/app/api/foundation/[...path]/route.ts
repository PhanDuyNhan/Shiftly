import { foundationApi } from "@/server/foundation/api";

type Context = { params: Promise<{ path: string[] }> };
export async function GET(request: Request, context: Context) { return foundationApi(request,(await context.params).path,"GET"); }
export async function POST(request: Request, context: Context) { return foundationApi(request,(await context.params).path,"POST"); }
export async function PATCH(request: Request, context: Context) { return foundationApi(request,(await context.params).path,"PATCH"); }
export async function PUT(request: Request, context: Context) { return foundationApi(request,(await context.params).path,"PUT"); }
export async function DELETE(request: Request, context: Context) { return foundationApi(request,(await context.params).path,"DELETE"); }
