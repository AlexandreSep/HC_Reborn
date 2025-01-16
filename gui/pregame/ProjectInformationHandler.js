/**
 * Class to handle the project information items.
 */

class ProjectInformationHandler
{
	constructor(projectInformationItems)
	{
		for (let objectName in projectInformationItems)
			for (let propertyName in projectInformationItems[objectName])
				Engine.GetGUIObjectByName(objectName)[propertyName] = projectInformationItems[objectName][propertyName];


		this.canvas = Engine.GetGUIObjectByName("canvas");

		this.mainMenuLogo = Engine.GetGUIObjectByName("mainMenuLogo");
		this.mainMenuProductVersion = Engine.GetGUIObjectByName("mainMenuProductVersion");
		this.mainMenuBranding = Engine.GetGUIObjectByName("mainMenuBranding");

		this.mainMenuLogoSize = this.mainMenuLogo.size;
		this.mainMenuProductVersionSize = this.mainMenuProductVersion.size;
		this.mainMenuBrandingSize = this.mainMenuBranding.size;

		this.mainMenuLogo.onWindowResized = this.updateSize.bind(this);
		this.mainMenuProductVersion.onWindowResized = this.updateSize.bind(this);
		this.mainMenuBranding.onWindowResized = this.updateSize.bind(this);

		this.updateSize();
	}

	updateSize()
	{
		if (this.canvas.getComputedSize().right <= 1800)
		{

			const offset = 100;

			let size = this.mainMenuLogo.size;
			size.top = this.mainMenuLogoSize.top + offset,
			size.bottom = this.mainMenuLogoSize.bottom + offset;
			this.mainMenuLogo.size = size;

			size = this.mainMenuProductVersion.size;
			size.top = this.mainMenuProductVersionSize.top - offset,
			size.bottom = this.mainMenuProductVersionSize.bottom - offset;
			this.mainMenuProductVersion.size = size;

			size = this.mainMenuBranding.size;
			size.top = this.mainMenuBrandingSize.top - offset,
			size.bottom = this.mainMenuBrandingSize.bottom - offset;
			this.mainMenuBranding.size = size;
		}
		else
		{
			this.mainMenuLogo.size = this.mainMenuLogoSize;
			this.mainMenuProductVersion.size = this.mainMenuProductVersionSize;
			this.mainMenuBranding.size = this.mainMenuBrandingSize;
		}
	}
}