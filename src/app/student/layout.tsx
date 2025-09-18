import { StudentNav } from '@/components/layouts/student-nav'

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <StudentNav />
      <main className="py-6">
        {children}
      </main>
    </div>
  )
}