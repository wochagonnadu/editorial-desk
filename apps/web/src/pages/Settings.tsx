import React from 'react';
import { Users, CreditCard, Sliders, Bell, Save } from 'lucide-react';

export function Settings() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">Settings</h1>
          <p className="text-ink-500 mt-1">Manage your newsroom preferences.</p>
        </div>
        <button className="btn-primary">
          <Save className="w-4 h-4 mr-2" />
          Save changes
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1 space-y-1">
          <button className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-xl bg-beige-100 text-ink-900 transition-colors">
            <Users className="w-4 h-4 mr-3" />
            Team
          </button>
          <button className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-xl text-ink-500 hover:bg-beige-50 hover:text-ink-900 transition-colors">
            <CreditCard className="w-4 h-4 mr-3" />
            Billing
          </button>
          <button className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-xl text-ink-500 hover:bg-beige-50 hover:text-ink-900 transition-colors">
            <Sliders className="w-4 h-4 mr-3" />
            Editorial Defaults
          </button>
          <button className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-xl text-ink-500 hover:bg-beige-50 hover:text-ink-900 transition-colors">
            <Bell className="w-4 h-4 mr-3" />
            Notifications
          </button>
        </div>

        <div className="md:col-span-3 space-y-6">
          <section className="card space-y-6">
            <h2 className="text-xl font-serif font-medium border-b border-ink-100 pb-3">Team Management</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-beige-50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <img src="https://picsum.photos/seed/user1/100/100" alt="Sarah Editor" className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                  <div>
                    <p className="font-medium text-ink-900">Sarah Editor</p>
                    <p className="text-sm text-ink-500">sarah@example.com</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-ink-500 bg-white px-3 py-1 rounded-lg border border-ink-100">Owner</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-white border border-ink-100 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-ink-100 flex items-center justify-center text-ink-500 font-medium">FT</div>
                  <div>
                    <p className="font-medium text-ink-900">Factcheck Team</p>
                    <p className="text-sm text-ink-500">factcheck@example.com</p>
                  </div>
                </div>
                <select className="text-sm font-medium text-ink-900 bg-beige-50 px-3 py-1.5 rounded-lg border border-ink-100 focus:outline-none focus:ring-2 focus:ring-ink-900">
                  <option>Reviewer</option>
                  <option>Editor</option>
                  <option>Admin</option>
                </select>
              </div>
            </div>

            <button className="btn-secondary w-full">Invite team member</button>
          </section>

          <section className="card space-y-6">
            <h2 className="text-xl font-serif font-medium border-b border-ink-100 pb-3">Workspace Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1">Workspace Name</label>
                <input type="text" defaultValue="Acme Corp Newsroom" className="w-full px-4 py-2 rounded-xl border border-ink-100 bg-white focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-transparent" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1">Default Factcheck Strictness</label>
                <select className="w-full px-4 py-2 rounded-xl border border-ink-100 bg-white focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-transparent">
                  <option>Standard (Verify claims and stats)</option>
                  <option>High (Verify all statements and tone)</option>
                  <option>Low (Basic grammar and flow)</option>
                </select>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
