import { Request, Response } from "express";
import { SupabaseService } from "../services/SupabaseService";

export class StatisticsController {
  private static supabaseService = new SupabaseService();

  /**
   * Get count of active jobs by role
   */
  static async getJobCountsByRole(req: Request, res: Response): Promise<void> {
    try {
      // Get job counts by role
      const roleCounts = await StatisticsController.supabaseService.getActiveJobCountsByRole();

      // Calculate total active jobs
      const totalActiveJobs = Object.values(roleCounts).reduce((sum, count) => sum + count, 0);

      // Sort roles by count (descending)
      const sortedRoles = Object.entries(roleCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([role, count]) => ({
          role,
          count,
          percentage: totalActiveJobs > 0 ? ((count / totalActiveJobs) * 100).toFixed(1) : "0.0"
        }));

      res.status(200).json({
        status: "success",
        message: "Job counts by role retrieved successfully",
        data: {
          totalActiveJobs,
          roles: sortedRoles,
          summary: roleCounts
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Error getting job counts by role:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to get job counts by role",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get count of active jobs by technology
   */
  static async getJobCountsByTechnology(req: Request, res: Response): Promise<void> {
    try {
      // Get top N technologies (default 50, max 200)
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      
      // Get job counts by technology
      const techCounts = await StatisticsController.supabaseService.getActiveJobCountsByTechnology();

      // Calculate total (note: a job can have multiple technologies, so this is total technology occurrences)
      const totalOccurrences = Object.values(techCounts).reduce((sum, count) => sum + count, 0);

      // Sort technologies by count (descending) and limit
      const sortedTechnologies = Object.entries(techCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([technology, count]) => ({
          technology,
          count,
          percentage: totalOccurrences > 0 ? ((count / totalOccurrences) * 100).toFixed(1) : "0.0"
        }));

      res.status(200).json({
        status: "success",
        message: `Top ${sortedTechnologies.length} technologies by job count retrieved successfully`,
        data: {
          totalTechnologies: Object.keys(techCounts).length,
          displayedTechnologies: sortedTechnologies.length,
          technologies: sortedTechnologies,
          note: "Percentages are based on technology occurrences, not unique jobs"
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Error getting job counts by technology:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to get job counts by technology",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get job role trends by week
   */
  static async getJobRoleTrends(req: Request, res: Response): Promise<void> {
    try {
      // Get weeks parameter (default 12 weeks, max 52)
      const weeks = Math.min(parseInt(req.query.weeks as string) || 12, 52);
      
      // Get role trends
      const trends = await StatisticsController.supabaseService.getJobRoleTrendsByWeek(weeks);

      res.status(200).json({
        status: "success",
        message: `Job role trends for the last ${weeks} weeks retrieved successfully`,
        data: trends,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Error getting job role trends:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to get job role trends",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  }
}