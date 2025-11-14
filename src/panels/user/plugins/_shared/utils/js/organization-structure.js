import { toRaw } from 'vue';
import { UserStore } from '@stores/user';
const userStore = UserStore();

// Create team tree structure
function createTeamTree(teams, parentId = null) {
    return teams
      .filter(team => {
  
        if (!team || !team.entity) return false;
  
        if (parentId === null) {
          return !team.entity.parent_team_id; 
        }
        
        return team.entity.parent_team_id === parentId;
      })
      .map(team => {
        const teamData = team.entity || {};
        
        return {
          ...teamData,
          role: team.role || 'member',
          effective_role: team.role || 'member',
          teams: createTeamTree(teams, teamData.id)
        };
      });
  }
  
  // Merge organizations and teams into a hierarchical structure
  export function mergeOrganizationsAndTeams() {
      // Get the data and unwrap proxies with toRaw
      const teams = toRaw(userStore.getTeams() || []);
      const orgs = toRaw(userStore.getOrganizations() || []);
      
      // Create organizations with nested team structure
      const enhancedOrgs = orgs.map(org => {
          const orgId = org.entity?.id;

          const orgTeams = teams.filter(team => {
              if (!team || !team.entity || !team.entity.organization_id) return false;
              return team.entity.organization_id === orgId;
          });

          // Create the team tree for this organization (only top-level teams)
          const topLevelTeams = createTeamTree(orgTeams, null);
          
          // FIX: Convert events object to array if it's an object (backend bug workaround)
          let orgEvents = org.entity?.events || [];
          if (orgEvents && typeof orgEvents === 'object' && !Array.isArray(orgEvents)) {
              orgEvents = Object.values(orgEvents);
          }
          
          return {
              ...(org.entity || {}),
              id: orgId,
              name: org.entity?.name || 'Unnamed Organization',
              slug: org.entity?.slug || 'unnamed-org',
              users: org.entity?.users || [],
              events: orgEvents, // ADD THIS LINE - include the fixed events array
              // Use the teams array with nested structure as requested
              teams: topLevelTeams
          };
      });
      
      return enhancedOrgs;
  }



export function hasAdminAccess(team) {
    if (!team) return false;
    
    return team.effective_role === 'admin' || team.role === 'admin';
}


export function getUserCount(team) {
    if (!team) return 0;
    if (!team.users) return 0;
    return team.users.length;
}

export function hasSubteams(team) {
    return team && team.teams && Array.isArray(team.teams) && team.teams.length > 0;
}