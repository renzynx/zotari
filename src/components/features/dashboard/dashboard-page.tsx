"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  HardDrive,
  ArrowUpRight,
  Webhook,
  ChartPieIcon,
  BarChart,
  AreaChart,
  LineChart,
  Upload,
  Download,
  ExternalLink,
  Infinity,
} from "lucide-react";
import { WebhooksInputProps } from "./webhooks-input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  LineChart as RechartsLineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart as RechartsAreaChart,
  Area,
} from "recharts";
import {
  getDashboardStats,
  getActivityData,
  getStorageData,
  getFileTypeDistribution,
  getStorageByType,
} from "@/app/actions/dashboard";
import { toast } from "sonner";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f97316",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f59e0b",
  "#ef4444",
];

export default function DashboardPage({
  userId,
  webhooks,
}: WebhooksInputProps) {
  const router = useRouter();

  // State for all dashboard data
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalFiles: 0,
    recentUploads: 0,
    totalStorage: 0,
    storageUnit: "MB",
    uploadsTrend: "+0%",
    storageTrend: "+0%",
    storagePercentage: 0,
    storageTier: "UNLIMITED",
  });
  const [activityData, setActivityData] = useState<any[]>([]);
  const [storageData, setStorageData] = useState<any[]>([]);
  const [fileTypeData, setFileTypeData] = useState<any[]>([]);
  const [storageByTypeData, setStorageByTypeData] = useState<any[]>([]);

  // Calculate stats for summary cards
  const getTrendClass = (trend: string) => {
    return trend.startsWith("+") ? "text-green-500" : "text-red-500";
  };

  // Fetch data from server actions
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch all data in parallel
        const [dashboardStats, activity, storage, fileTypes, storageTypes] =
          await Promise.all([
            getDashboardStats(userId),
            getActivityData(userId),
            getStorageData(userId),
            getFileTypeDistribution(userId),
            getStorageByType(userId),
          ]);

        setStats(dashboardStats);
        setActivityData(activity);
        setStorageData(storage);
        setFileTypeData(fileTypes);
        setStorageByTypeData(storageTypes);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userId]);

  return (
    <div className="w-full p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Your file storage metrics and usage at a glance
        </p>
      </div>

      {/* Summary Stats Row */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 mb-6">
        <Card className={loading ? "animate-pulse" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.totalFiles}</div>
              <div className="p-2 bg-blue-100 rounded-full dark:bg-blue-900/20">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={loading ? "animate-pulse" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Storage Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {stats.totalStorage} {stats.storageUnit}
                <span
                  className={`text-sm ml-1 ${getTrendClass(
                    stats.storageTrend
                  )}`}
                >
                  {stats.storageTrend}
                </span>
              </div>
              <div className="p-2 bg-purple-100 rounded-full dark:bg-purple-900/20">
                <HardDrive className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="flex items-center mt-2">
              <Infinity className="h-4 w-4 mr-1 text-purple-600" />
              <p className="text-xs text-purple-600 font-semibold">
                UNLIMITED STORAGE
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className={loading ? "animate-pulse" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recent Uploads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {stats.recentUploads}
                <span
                  className={`text-sm ml-1 ${getTrendClass(
                    stats.uploadsTrend
                  )}`}
                >
                  {stats.uploadsTrend}
                </span>
              </div>
              <div className="p-2 bg-green-100 rounded-full dark:bg-green-900/20">
                <ArrowUpRight className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={loading ? "animate-pulse" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Webhooks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{webhooks.length}</div>
              <div className="p-2 bg-indigo-100 rounded-full dark:bg-indigo-900/20">
                <Webhook className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 mb-6">
        {/* Activity Over Time */}
        <Card className={loading ? "animate-pulse" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AreaChart className="h-5 w-5 text-muted-foreground" />
              Activity Over Time
            </CardTitle>
            <CardDescription>
              File uploads and downloads over the past week
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[300px] w-full">
              {loading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : activityData.length === 0 ? (
                <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground">
                  <p>No activity data available</p>
                  <p className="text-sm">Upload files to see activity trends</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsAreaChart
                    data={activityData}
                    margin={{
                      top: 10,
                      right: 10,
                      left: 0,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="uploads"
                      name="Uploads"
                      stackId="1"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="downloads"
                      name="Downloads"
                      stackId="1"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.6}
                    />
                  </RechartsAreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Storage Usage Over Time */}
        <Card className={loading ? "animate-pulse" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-muted-foreground" />
              Storage Usage
            </CardTitle>
            <CardDescription>
              Storage consumption over time (in MB)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[300px] w-full">
              {loading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : storageData.length === 0 ? (
                <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground">
                  <p>No storage data available</p>
                  <p className="text-sm">Upload files to see storage trends</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart
                    data={storageData}
                    margin={{
                      top: 10,
                      right: 10,
                      left: 0,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Line
                      type="monotone"
                      dataKey="storage"
                      name="Storage (MB)"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 mb-6">
        {/* File Types Distribution */}
        <Card className={loading ? "animate-pulse" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartPieIcon className="h-5 w-5 text-muted-foreground" />
              File Type Distribution
            </CardTitle>
            <CardDescription>Breakdown of your files by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center">
              {loading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : fileTypeData.length === 0 ? (
                <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground">
                  <p>No file type data available</p>
                  <p className="text-sm">
                    Upload files to see type distribution
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={fileTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {fileTypeData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => `${value} files`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Storage by File Type */}
        <Card className={loading ? "animate-pulse" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5 text-muted-foreground" />
              Storage by File Type
            </CardTitle>
            <CardDescription>
              Storage consumption by file type (in MB)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {loading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : storageByTypeData.length === 0 ? (
                <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground">
                  <p>No storage by type data available</p>
                  <p className="text-sm">
                    Upload files to see storage breakdown
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    data={storageByTypeData}
                    margin={{
                      top: 10,
                      right: 10,
                      left: 0,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="storage" name="Storage (MB)" fill="#8b5cf6" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks and navigation shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button
            className="flex items-center gap-2"
            onClick={() => router.push("/dashboard/upload")}
          >
            <Upload className="h-4 w-4" />
            Upload Files
          </Button>
          <Button
            className="flex items-center gap-2"
            variant="outline"
            onClick={() => router.push("/dashboard/files")}
          >
            <Download className="h-4 w-4" />
            Manage Files
          </Button>
          <Button
            className="flex items-center gap-2"
            variant="outline"
            onClick={() => router.push("/dashboard/webhooks")}
          >
            <Webhook className="h-4 w-4" />
            Manage Webhooks
          </Button>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground border-t pt-4">
          <div className="flex items-center gap-1">
            <ExternalLink className="h-4 w-4" />
            <span>
              Navigate to dedicated pages for more actions and details
            </span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
