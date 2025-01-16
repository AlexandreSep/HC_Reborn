// HC-Code
// This function returns true, if all requirements for a specific technology are researched
// This is used to hide technologies if their prerequisites are not fulfilled
Researcher.prototype.requiredTechnologiesAreResearched = function(template)
{
    let requiredTechIsNotResearched = false;

    let cmpPlayer = QueryOwnerInterface(this.entity);
	if (!cmpPlayer)
		return true;
        
    let cmpTechnologyManager = QueryPlayerIDInterface(cmpPlayer.playerID, IID_TechnologyManager);
   	if (template.hideIfTechnologyRequirementIsNotMet && template.hideIfTechnologyRequirementIsNotMet == "true"){
		for (let requirement of template.requirements.all){
			let requiredTech = requirement.tech;
			if (!requiredTech){
				continue;
			}
			
			if (!cmpTechnologyManager.IsTechnologyResearched(requiredTech)){
				requiredTechIsNotResearched = true;
			}
		}
		if (requiredTechIsNotResearched){
			return false;
		}
	}

	return true;
}
