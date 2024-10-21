g_BackgroundLayerData.push(
	[
		{
			"offset": (time, width) => -0.12 * width * Math.cos(0.05 * time),
			"sprite": "background-hylian-1",
			"tiling": true,
		},
		
		{
			"offset": (time, width) => -0.15 * width * Math.cos(0.05 * time),
			"sprite": "background-hylian-2",
			"tiling": false,
		},
		
		{
			"offset": (time, width) => -0.18 * width * Math.cos(0.05 * time),
			"sprite": "background-hylian-3",
			"tiling": false,
		},
		{
			"offset": (time, width) => -0.22 * width * Math.cos(0.05 * time),
			"sprite": "background-hylian-4",
			"tiling": false,
		},	
		{
			"offset": (time, width) => -0.32 * width * Math.cos(0.05 * time),
			"sprite": "background-hylian-5",
			"tiling": false,
		},	
	]);
