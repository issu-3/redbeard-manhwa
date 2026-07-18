import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  searchParams.get('q');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  searchParams.get('genre');
  searchParams.get('status');
  searchParams.get('sort');
  searchParams.get('order');

  try {
    // In production, this queries the database via Prisma
    // const where: Prisma.SeriesWhereInput = {};
    // if (query) where.title = { contains: query, mode: 'insensitive' };
    // if (genre) where.genres = { some: { slug: genre } };
    // if (status) where.status = status as SeriesStatus;
    //
    // const orderBy = getOrderBy(sort, order);
    // const series = await prisma.series.findMany({
    //   where,
    //   orderBy,
    //   skip: (page - 1) * limit,
    //   take: limit,
    //   include: { genres: true, _count: { select: { chapters: true } } },
    // });
    // const total = await prisma.series.count({ where });

    return NextResponse.json({
      success: true,
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Series API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch series' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await request.json();

    // Validate with Zod
    // const parsed = seriesSchema.safeParse(body);
    // if (!parsed.success) {
    //   return NextResponse.json(
    //     { success: false, error: parsed.error.flatten().fieldErrors },
    //     { status: 400 }
    //   );
    // }

    // In production:
    // const series = await prisma.series.create({
    //   data: { ...parsed.data, slug: slugify(parsed.data.title) },
    // });

    return NextResponse.json(
      { success: true, message: 'Series creation endpoint ready. Connect database to activate.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Series creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create series' },
      { status: 500 }
    );
  }
}
