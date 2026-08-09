import { Request, Response } from "express";
import mongoose from "mongoose";
import { Project } from "../../../models/project.model.js";
import { TestSuite } from "../../../models/testSuite.model.js";
import { TestCase } from "../../../models/testCase.model.js";
import { Ticket } from "../../../models/ticket.model.js";
import { TestRun } from "../../../models/testRun.model.js";
import { TicketStatus } from "../../ticket/types/ticket.types.js";
import { TestRunStatus } from "../../testRun/types/testRun.types.js";

interface StatusCount {
    status: string;
    count: number;
}

const countByStatus = (groups: StatusCount[], statuses: string[]): { status: string; count: number }[] =>
    statuses.map((status) => ({
        status,
        count: groups.find((group) => group.status === status)?.count ?? 0,
    }));

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const userObjectId = new mongoose.Types.ObjectId(userId);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(today.getDate() - 13);
        fourteenDaysAgo.setHours(0, 0, 0, 0);

        // Get user's projects (where user is owner or member)
        const userProjects = await Project.find({
            $or: [
                { ownerId: userObjectId },
                { members: userObjectId }
            ]
        }).select('_id');
        
        const userProjectIds = userProjects.map(p => p._id);

        // Early return if user has no projects to avoid unnecessary queries
        if (userProjectIds.length === 0) {
            const emptyChartData = [];
            for (let i = 0; i < 14; i++) {
                const date = new Date(fourteenDaysAgo);
                date.setDate(date.getDate() + i);
                const displayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                emptyChartData.push({
                    name: displayDate,
                    value: 0,
                    fullDate: date.toISOString().split('T')[0]
                });
            }
            return res.status(200).json({
                projectCount: 0,
                totalSuites: 0,
                suitesAddedToday: 0,
                totalTestCases: 0,
                testCasesModifiedToday: 0,
                chartData: emptyChartData,
                recentActivity: [],
            });
        }

        // 1. Project Count (only user's projects)
        const projectCount = userProjectIds.length;

        // 2. Total Suites & Suites Added Today (only from user's projects)
        const totalSuites = await TestSuite.countDocuments({
            projectId: { $in: userProjectIds }
        });
        const suitesAddedToday = await TestSuite.countDocuments({
            projectId: { $in: userProjectIds },
            createdAt: { $gte: today },
        });

        // 3. Total Test Cases & Modified/Created Today (only from user's projects)
        const totalTestCases = await TestCase.countDocuments({
            projectId: { $in: userProjectIds }
        });
        const testCasesModifiedToday = await TestCase.countDocuments({
            projectId: { $in: userProjectIds },
            updatedAt: { $gte: today },
        });

        // 4. Activity Overview (Last 14 days, only from user's projects)
        const activityOverview = await TestCase.aggregate([
            {
                $match: {
                    projectId: { $in: userProjectIds },
                    updatedAt: { $gte: fourteenDaysAgo },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" },
                    },
                    count: { $sum: 1 },
                },
            },
            {
                $sort: { _id: 1 },
            },
        ]);

        const chartData = [];
        for (let i = 0; i < 14; i++) {
            const date = new Date(fourteenDaysAgo);
            date.setDate(date.getDate() + i);
            const dateString = date.toISOString().split('T')[0];

            const found = activityOverview.find((item: { _id: string; count: number }) => item._id === dateString);

            const displayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            chartData.push({
                name: displayDate,
                value: found ? found.count : 0,
                fullDate: dateString
            });
        }

        // 5. Recent Activity (User specific, filtered by user's projects)
        const userTestCases = await TestCase.find({
            projectId: { $in: userProjectIds },
            $or: [
                { createdBy: userId },
                { 'history.userId': userId }
            ]
        })
            .sort({ updatedAt: -1 })
            .limit(50)
            .populate('createdBy', 'name email profilePicture')
            .populate('history.userId', 'name email profilePicture')
            .lean();

        interface UserAction {
            id: string;
            user: string;
            avatar: string;
            action: string;
            time: Date;
            testCaseId: string;
        }
        const userActions: UserAction[] = [];

        userTestCases.forEach((testCase: any) => {
            // Check creation
            if (testCase.createdBy?._id?.toString() === userId?.toString()) {
                userActions.push({
                    id: `${testCase._id}_create`,
                    user: testCase.createdBy.name,
                    avatar: testCase.createdBy.profilePicture || (testCase.createdBy.name ? testCase.createdBy.name.charAt(0).toUpperCase() : '?'),
                    action: `created test case "${testCase.title}"`,
                    time: testCase.createdAt,
                    testCaseId: testCase._id.toString()
                });
            }

            // Check history updates
            if (testCase.history && testCase.history.length > 0) {
                testCase.history.forEach((entry: any, index: number) => {
                    if (entry.userId?._id?.toString() === userId?.toString()) {
                        userActions.push({
                            id: `${testCase._id}_update_${index}`,
                            user: entry.userId.name,
                            avatar: entry.userId.profilePicture || (entry.userId.name ? entry.userId.name.charAt(0).toUpperCase() : '?'),
                            action: `updated test case "${testCase.title}"`,
                            time: entry.timestamp,
                            testCaseId: testCase._id.toString()
                        });
                    }
                });
            }
        });

        // Sort by time descending and take top 20
        userActions.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        const recentActivity = userActions.slice(0, 20);

        res.status(200).json({
            projectCount,
            totalSuites,
            suitesAddedToday,
            totalTestCases,
            testCasesModifiedToday,
            chartData,
            recentActivity,
        });
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getProjectDashboardStats = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const projectId = req.params.projectId as string;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json({ message: "Invalid project id" });
        }

        const project = await Project.findOne({
            _id: projectId,
            $or: [
                { ownerId: new mongoose.Types.ObjectId(userId) },
                { members: new mongoose.Types.ObjectId(userId) }
            ]
        }).select('_id name');

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        const [ticketGroups, runGroups, suitesCount, casesCount] = await Promise.all([
            Ticket.aggregate<StatusCount>([
                { $match: { projectId: project._id } },
                { $group: { _id: "$status", count: { $sum: 1 } } },
                { $project: { _id: 0, status: "$_id", count: 1 } },
            ]),
            TestRun.aggregate<StatusCount>([
                { $match: { projectId: project._id } },
                { $group: { _id: "$status", count: { $sum: 1 } } },
                { $project: { _id: 0, status: "$_id", count: 1 } },
            ]),
            TestSuite.countDocuments({ projectId: project._id }),
            TestCase.countDocuments({ projectId: project._id }),
        ]);

        res.status(200).json({
            projectId: project._id.toString(),
            projectName: project.name,
            ticketsByStatus: countByStatus(ticketGroups, Object.values(TicketStatus)),
            runsByStatus: countByStatus(runGroups, Object.values(TestRunStatus)),
            suitesCount,
            casesCount,
        });
    } catch (error) {
        console.error("Error fetching project dashboard stats:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
