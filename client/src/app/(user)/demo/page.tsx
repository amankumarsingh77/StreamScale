import React from 'react'

const page = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6">Profile</h2>
        <p className="mb-8">Manage your profile settings</p>
        <form>
          <div className="mb-6">
            <label className="block mb-2">Full name</label>
            <input
              type="text"
              className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600"
            />
          </div>
          <div className="mb-6">
            <label className="block mb-2">Location</label>
            <input
              type="text"
              className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600"
            />
          </div>
          <div className="mb-6">
            <label className="block mb-2">Bio</label>
            <textarea className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600"></textarea>
          </div>
          <div className="mb-6">
            <label className="block mb-2">
              Social Media
            </label>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Twitter/X"
                className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600"
              />
              <input
                type="text"
                placeholder="Github"
                className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600"
              />
              <input
                type="text"
                placeholder="Website"
                className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600"
              />
            </div>
          </div>
          <div className="mb-6">
            <label className="block mb-2">
              Email address
            </label>
            <input
              type="email"
              className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600"
            />
            <button
              type="button"
              className="mt-2 text-blue-400"
            >
              + Add another
            </button>
          </div>
          <div className="flex items-center justify-between mb-6">
            <button
              type="button"
              className="bg-red-600 px-4 py-2 rounded-lg"
            >
              Delete My Account
            </button>
            <button
              type="submit"
              className="bg-purple-600 px-4 py-2 rounded-lg"
            >
              Save
            </button>
          </div>
          <div className="text-center">
            <button
              type="button"
              className="bg-blue-600 px-4 py-2 rounded-lg"
            >
              Download your personal data
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default page
