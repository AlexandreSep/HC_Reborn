g_BackgroundLayerData.push(
	[
		{
			"offset": (time, width) => 0.07 * width * Math.cos(0.05 * time),
			"sprite": "background-deku-1",
			"tiling": false,
		},
		
		{
			"offset": (time, width) => 0.03 * width * Math.cos(0.05 * time),
			"sprite": "background-deku-2",
			"tiling": false,
		},
		
		{
			"offset": (time, width) => 0.17 * width * Math.cos(0.05 * time),
			"sprite": "background-deku-3",
			"tiling": false,
		},
		{
			"offset": (time, width) => -0.17 * width * Math.cos(0.05 * time),
			"sprite": "background-deku-4",
			"tiling": false,
		},	
		{
			"offset": (time, width) => 0.09 * width * Math.cos(0.05 * time),
			"sprite": "background-deku-5",
			"tiling": false,
		},	
	]);
