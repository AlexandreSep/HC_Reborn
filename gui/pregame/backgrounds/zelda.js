g_BackgroundLayerData.push(
	[
		{
			"offset": (time, width) => -0.12 * width * Math.cos(0.05 * time),
			"sprite": "background-zelda-1",
			"tiling": true,
		},
		{
			"offset": (time, width) => -0.32 * width * Math.cos(0.05 * time),
			"sprite": "background-zelda-bk",
			"tiling": true,
		},
		{
			"offset": (time, width) => -0.12 * width * Math.cos(0.05 * time) - width/4,
			"sprite": "background-zelda-2",
			"tiling": false,
		},
		
		{
			"offset": (time, width) => 0.16 * width * Math.cos(0.05 * time) + width/7,
			"sprite": "background-zelda-3",
			"tiling": false,
		},
		{
			"offset": (time, width) => 0.52 * width * Math.cos(0.05 * time),
			"sprite": "background-zelda-4",
			"tiling": false,
		},	
	]);
