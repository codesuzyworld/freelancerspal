'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';

export default function TestAuth() {
    const [userData, setUserData] = useState<any>(null);
    const [userRoles, setUserRoles] = useState<any[]>([]);
    const [userPermissions, setUserPermissions] = useState<any[]>([]);
    const supabase = createClient();

    useEffect(() => {
        async function fetchData() {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            setUserData(user);

            if (user) {
                // Get user's roles
                const { data: roles } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', user.id);
                
                setUserRoles(roles || []);

                // Get permissions for these roles
                if (roles && roles.length > 0) {
                    const { data: permissions } = await supabase
                        .from('role_permissions')
                        .select('permission')
                        .in('role', roles.map(r => r.role));
                    
                    setUserPermissions(permissions || []);
                }
            }
        }

        fetchData();
    }, []);

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Auth Test Page</h1>
            
            <div className="space-y-6">
                <div className="bg-white p-4 rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-2">User Info</h2>
                    <pre className="bg-gray-50 p-2 rounded">
                        {JSON.stringify(userData, null, 2)}
                    </pre>
                </div>

                <div className="bg-white p-4 rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-2">User Roles</h2>
                    {userRoles.length > 0 ? (
                        <ul className="list-disc pl-5">
                            {userRoles.map((role, index) => (
                                <li key={index}>{role.role}</li>
                            ))}
                        </ul>
                    ) : (
                        <p>No roles assigned</p>
                    )}
                </div>

                <div className="bg-white p-4 rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-2">User Permissions</h2>
                    {userPermissions.length > 0 ? (
                        <ul className="list-disc pl-5">
                            {userPermissions.map((perm, index) => (
                                <li key={index}>{perm.permission}</li>
                            ))}
                        </ul>
                    ) : (
                        <p>No permissions found</p>
                    )}
                </div>
            </div>
        </div>
    );
} 