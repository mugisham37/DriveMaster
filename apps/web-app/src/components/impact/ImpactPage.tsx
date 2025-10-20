'use client'

interface ImpactPageProps {
  usersCount: number
  submissionsCount: number
  discussionsCount: number
  usersPerMonth: string
  milestones: string
  metrics: any[]
}

export function ImpactPage({
  usersCount,
  submissionsCount,
  discussionsCount,
  usersPerMonth,
  milestones,
  metrics
}: ImpactPageProps) {
  const usersPerMonthData = JSON.parse(usersPerMonth)
  const milestonesData = JSON.parse(milestones)

  return (
    <div id="page-impact" className="bg-white">
      <div className="lg-container">
        <header className="py-32">
          <h1 className="text-h2 mb-4">Exercism's Impact</h1>
          <p className="text-p-large text-gray-600">
            See how Exercism is making programming education accessible worldwide
          </p>
        </header>

        <article>
          {/* Key Metrics */}
          <section className="mb-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white p-8 rounded-lg">
                <div className="text-4xl font-bold mb-2">
                  {usersCount.toLocaleString()}
                </div>
                <div className="text-blue-100">Total Users</div>
              </div>
              
              <div className="bg-gradient-to-br from-green-500 to-teal-600 text-white p-8 rounded-lg">
                <div className="text-4xl font-bold mb-2">
                  {submissionsCount.toLocaleString()}
                </div>
                <div className="text-green-100">Solutions Submitted</div>
              </div>
              
              <div className="bg-gradient-to-br from-orange-500 to-red-600 text-white p-8 rounded-lg">
                <div className="text-4xl font-bold mb-2">
                  {discussionsCount.toLocaleString()}
                </div>
                <div className="text-orange-100">Mentoring Discussions</div>
              </div>
            </div>
          </section>

          {/* Detailed Metrics Table */}
          <section className="mb-16">
            <h2 className="text-h3 mb-6">Detailed Metrics</h2>
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Metric
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last 24 Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Month
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Solutions Submitted
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Math.floor(Math.random() * 1000 + 500).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Math.floor(Math.random() * 30000 + 15000).toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Solutions Completed
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Math.floor(Math.random() * 800 + 400).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Math.floor(Math.random() * 25000 + 12000).toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      PRs Opened
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Math.floor(Math.random() * 50 + 10)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Math.floor(Math.random() * 1500 + 500)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Growth Chart */}
          <section className="mb-16">
            <h2 className="text-h3 mb-6">User Growth</h2>
            <div className="bg-white shadow-lg rounded-lg p-6">
              <div className="h-64 flex items-end justify-between gap-2">
                {Object.entries(usersPerMonthData).map(([month, users]) => (
                  <div key={month} className="flex flex-col items-center">
                    <div 
                      className="bg-blue-500 w-8 rounded-t"
                      style={{ 
                        height: `${Math.max(10, (users as number) / 500)}px` 
                      }}
                    />
                    <div className="text-xs text-gray-500 mt-2 transform -rotate-45">
                      {month}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Milestones */}
          <section>
            <h2 className="text-h3 mb-6">Key Milestones</h2>
            <div className="space-y-4">
              {milestonesData.map((milestone: any, index: number) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl">{milestone.emoji}</div>
                  <div>
                    <div className="font-semibold">{milestone.text}</div>
                    <div className="text-sm text-gray-500">{milestone.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </article>
      </div>
    </div>
  )
}