/**
 * The top menu holds the elements one would frequently acces and don't have submenus
 */
class TopMenuItemHandler
{
	constructor(topMenuLeft, topMenuRight)
	{
		this.topMenu  = Engine.GetGUIObjectByName("topMenu");
		this.leftMenu  = Engine.GetGUIObjectByName("topMenuLeftSide");
		this.rightMenu = Engine.GetGUIObjectByName("topMenuRightSide");
		let buttonsLeft = this.leftMenu.children;
		let buttonsRight = this.rightMenu.children;

		topMenuLeft.forEach((buttonInfo, i) => {
			let button = buttonsLeft[i];
			button.hidden = false;
			for (let propertyName in buttonInfo)
				button[propertyName] = buttonInfo[propertyName];

		});

		topMenuRight.forEach((buttonInfo, i) => {
			let button = buttonsRight[i];
			button.hidden = false;
			for (let propertyName in buttonInfo)
				button[propertyName] = buttonInfo[propertyName];

		});

		if (buttonsLeft.length + buttonsRight.length < topMenuLeft.length + topMenuRight.length)
			error("GUI page has space for " + buttonsLeft.length + buttonsRight.length + " top menu, but " + menuItems.length + " items are provided!");

		this.canvas = Engine.GetGUIObjectByName("canvas");

		this.topMenuSize = this.topMenu.size;
		this.leftMenuSize = this.leftMenu.size;
		this.rightMenuSize = this.rightMenu.size;

		this.topMenu.onWindowResized = this.updateSize.bind(this);
		this.leftMenu.onWindowResized = this.updateSize.bind(this);
		this.rightMenu.onWindowResized = this.updateSize.bind(this);
		this.updateSize();
	}

	updateSize()
	{
		if (this.canvas.getComputedSize().right <= 1800)
		{
			this.topMenu.size = "0% 0% 100% 68";

			this.leftMenu.size = "0% 0% 50% 100%";
			this.rightMenu.size = "50% 0% 100% 100%";
		}
		else
		{
			this.topMenu.size = this.topMenuSize;
			this.leftMenu.size = this.leftMenuSize;
			this.rightMenu.size = this.rightMenuSize;
		}
	}
}
