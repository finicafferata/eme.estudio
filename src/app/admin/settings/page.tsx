export default function AdminSettingsPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">General Settings</h2>
          <p className="text-gray-600">Configure general application settings</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Email Settings</h2>
          <p className="text-gray-600">Configure email notifications</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Payment Settings</h2>
          <p className="text-gray-600">Configure payment processing</p>
        </div>
      </div>
    </div>
  )
}