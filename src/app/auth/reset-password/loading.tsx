export default function ResetPasswordLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-6"></div>
        <h1 className="text-xl font-semibold text-gray-900">
          Loading reset password page...
        </h1>
      </div>
    </div>
  );
} 