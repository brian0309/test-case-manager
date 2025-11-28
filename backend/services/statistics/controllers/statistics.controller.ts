import { Request, Response } from "express";
import { Project } from "../../../models/project.model.js";
import { TestSuite } from "../../../models/testSuite.model.js";
import { TestCase } from "../../../models/testCase.model.js";

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(today.getDate() - 13);
        fourteenDaysAgo.setHours(0, 0, 0, 0);

        // 1. Project Count
        const projectCount = await Project.countDocuments();

        // 2. Total Suites & Suites Added Today
        const totalSuites = await TestSuite.countDocuments();
        const suitesAddedToday = await TestSuite.countDocuments({
            createdAt: { $gte: today },
        });

        // 3. Total Test Cases & Modified/Created Today
        const totalTestCases = await TestCase.countDocuments();
        const testCasesModifiedToday = await TestCase.countDocuments({
            updatedAt: { $gte: today },
        });

        // 4. Activity Overview (Last 14 days)
        const activityOverview = await TestCase.aggregate([
            {
                $match: {
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

        // 5. Recent Activity (User specific)
        const userId = req.userId;

        const userTestCases = await TestCase.find({
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

        let userActions: any[] = [];

        userTestCases.forEach((testCase: any) => {
            // Check creation
            if (testCase.createdBy?._id?.toString() === userId?.toString()) {
                userActions.push({
                    id: `${testCase._id}_create`,
                    user: testCase.createdBy.name,
                    avatar: testCase.createdBy.profilePicture || (testCase.createdBy.name ? testCase.createdBy.name.charAt(0).toUpperCase() : '?'),
                    action: `created test case "${testCase.title}"`,
                    time: testCase.createdAt
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
                            time: entry.timestamp
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
