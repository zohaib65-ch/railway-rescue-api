'use strict';

const { prisma } = require('../config/database');

// ─── HELPER FOR DATE RANGE ────────────────────────────────────────────────────

function getDateFilter(startDate, endDate) {
  const filter = {};
  if (startDate) filter.gte = new Date(startDate);
  if (endDate) filter.lte = new Date(endDate);
  return Object.keys(filter).length > 0 ? filter : undefined;
}

// ─── 1. SUMMARY STATS ─────────────────────────────────────────────────────────

async function getSummary(filters = {}) {
  const { startDate, endDate } = filters;
  const dateFilter = getDateFilter(startDate, endDate);

  const where = dateFilter ? { createdAt: dateFilter } : {};

  // Trains by status
  const trainsByStatus = await prisma.train.groupBy({
    by: ['status'],
    where,
    _count: { id: true },
  });

  // Assignments by status
  const assignmentsByStatus = await prisma.assignment.groupBy({
    by: ['status'],
    where: dateFilter ? { assignedAt: dateFilter } : {},
    _count: { id: true },
  });

  // Rescue teams currently available
  const availableTeams = await prisma.rescueTeam.count({
    where: { isAvailable: true },
  });

  // Format into a clean response
  const formatCounts = (arr) =>
    arr.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {});

  return {
    trains: formatCounts(trainsByStatus),
    assignments: formatCounts(assignmentsByStatus),
    rescueTeams: { available: availableTeams },
  };
}

// ─── 2. TRAINS OVER TIME (DAILY BUCKETS) ──────────────────────────────────────

async function getTrainsOverTime(filters = {}) {
  const { startDate, endDate } = filters;
  const dateFilter = getDateFilter(startDate, endDate);
  const where = dateFilter ? { createdAt: dateFilter } : {};

  // Note: Prisma does not have built-in date truncation across all databases identically without raw queries.
  // For standard reporting, we'll fetch them and bucket them in JS.
  // In a very large DB, we'd use raw SQL for efficiency.
  
  const trains = await prisma.train.findMany({
    where,
    select: { createdAt: true, status: true },
    orderBy: { createdAt: 'asc' },
  });

  const buckets = {};

  trains.forEach((t) => {
    // Bucket by YYYY-MM-DD
    const dateStr = t.createdAt.toISOString().split('T')[0];
    if (!buckets[dateStr]) {
      buckets[dateStr] = { active: 0, completed: 0, cancelled: 0, total: 0 };
    }
    buckets[dateStr][t.status]++;
    buckets[dateStr].total++;
  });

  return Object.entries(buckets).map(([date, counts]) => ({
    date,
    ...counts,
  }));
}

// ─── 3. RESCUE TEAM PERFORMANCE ───────────────────────────────────────────────

async function getTeamPerformance(filters = {}) {
  const { startDate, endDate } = filters;
  const dateFilter = getDateFilter(startDate, endDate);

  const teams = await prisma.rescueTeam.findMany({
    include: {
      assignments: {
        where: dateFilter ? { assignedAt: dateFilter } : {},
        select: { status: true },
      },
    },
  });

  return teams.map((team) => {
    let totalAssignments = 0;
    let resolvedCount = 0;

    team.assignments.forEach((a) => {
      totalAssignments++;
      if (a.status === 'resolved') resolvedCount++;
    });

    return {
      teamId: team.id,
      name: team.name,
      isAvailable: team.isAvailable,
      totalAssignments,
      resolvedCount,
      successRate: totalAssignments > 0 ? ((resolvedCount / totalAssignments) * 100).toFixed(1) + '%' : '0%',
    };
  });
}

// ─── 4. RESOLUTION TIME ───────────────────────────────────────────────────────

async function getResolutionTime(filters = {}) {
  const { startDate, endDate } = filters;
  const dateFilter = getDateFilter(startDate, endDate);

  // We only care about completed trains that have a resolvedAt date
  const resolvedTrains = await prisma.train.findMany({
    where: {
      status: 'completed',
      resolvedAt: { not: null },
      ...(dateFilter && { createdAt: dateFilter }),
    },
    select: {
      id: true,
      trainNumber: true,
      createdAt: true,
      resolvedAt: true,
    },
  });

  if (resolvedTrains.length === 0) {
    return { averageHours: 0, averageMinutes: 0, totalResolved: 0 };
  }

  let totalMinutes = 0;

  resolvedTrains.forEach((t) => {
    const diffMs = t.resolvedAt.getTime() - t.createdAt.getTime();
    totalMinutes += diffMs / (1000 * 60);
  });

  const avgMinutes = totalMinutes / resolvedTrains.length;

  return {
    totalResolved: resolvedTrains.length,
    averageHours: parseFloat((avgMinutes / 60).toFixed(2)),
    averageMinutes: Math.round(avgMinutes),
  };
}

// ─── 5. CSV EXPORT ────────────────────────────────────────────────────────────

async function exportTrainsCSV(filters = {}) {
  const { startDate, endDate } = filters;
  const dateFilter = getDateFilter(startDate, endDate);

  const trains = await prisma.train.findMany({
    where: dateFilter ? { createdAt: dateFilter } : {},
    include: {
      publishedBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Basic CSV builder
  const headers = ['ID', 'Train Number', 'Status', 'Movement Type', 'Location', 'Published By', 'Created At'];
  const rows = trains.map((t) => [
    t.id,
    t.trainNumber,
    t.status,
    t.movementType,
    `"${t.location || ''}"`,
    t.publishedBy ? `"${t.publishedBy.name} (${t.publishedBy.email})"` : 'Unknown',
    t.createdAt.toISOString(),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  return csvContent;
}

module.exports = {
  getSummary,
  getTrainsOverTime,
  getTeamPerformance,
  getResolutionTime,
  exportTrainsCSV,
};
