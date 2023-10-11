#version 300 es
precision highp float;

// INPUT -----------------------------
in vec2 uv;
in vec3 PV; 
in vec3 NO; 
in vec3 TG; 


// OUPUT -----------------------------
out vec4 oFragmentColor;


// UNIFORM -----------------------------
uniform sampler2D iDN; // augmented terrain and normals


// ---- colormap -----------------------------
vec3 hill_shading_color(float h, float N) // h : height, N : scalar product between mesh normal and augmented terrain normal
{
    // materials
	#define c_water vec3(.015, .110, .455)
	#define c_grass vec3(.086, .132, .018)
	#define c_beach vec3(.153, .172, .121)
	#define c_rock  vec3(.080, .050, .030)
	#define c_snow  vec3(.600, .600, .600)

	// limits
	#define l_water .06
	#define l_shore .15
	#define l_grass .211
	#define l_rock .351

	float s = smoothstep(.4, 1., N);
    
	vec3 rock = mix(
		c_rock, c_snow,
		smoothstep(1. - .3*s, 1. - .2*s, h));

	vec3 grass = mix(
		c_grass, rock,
		smoothstep(l_grass, l_rock, h));
		
	vec3 shoreline = mix(
		c_beach, grass,
		smoothstep(l_shore, l_grass, h));

	vec3 water = mix(
		c_water / 2., c_water,
		smoothstep(0., l_water, h));

	
	return mix(
		water, shoreline,
		smoothstep(l_water, l_shore, h));
}



vec3 hillshading(vec3 local_normal, float altitude)
{
	mat3 tbn = mat3(normalize(TG), normalize(cross(TG,NO)),normalize(NO));
	vec3 normal = tbn*local_normal;

    vec3 light =  normalize(vec3(1000.0,2500.0, 1000.0)-PV); // light direction

	float s0 = max(0.0,dot(normal , light));
    float s = s0;
    s = .4 * (1.+s);
    s *= s;
    s *= s;

    // normalizd direction
    float t = dot(normal.xy, normalize(vec2(1., 1.)));
    t = .5 * (1.+t);

    // combined colors
    vec3 c_alt = hill_shading_color(altitude, dot(local_normal, normalize(NO)));
    vec3 c_norm = s * mix(vec3(.65, .75, .85), vec3(1., .95, .8), t);
    
    vec3 c = c_norm + c_alt;
	return c;
}






// MAIN PROGRAM -----------------------------
void main()
{
	float alt_global = texture(iDN,uv).x; // augmented terrain
	vec3 locNo = texture(iDN,uv).yzw;     // normals to augmented terrain
	
    // shading
    vec3 shading_global = hillshading(locNo, alt_global);

    // output
	oFragmentColor = gl_FrontFacing ? vec4(shading_global, 1.) : vec4(0.);
}



