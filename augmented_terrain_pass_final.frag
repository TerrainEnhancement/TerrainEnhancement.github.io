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
		c_rock, c_rock, // c_snow,
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
		grass, shoreline,         // water
		smoothstep(l_water, l_shore, h));
}


vec3 colormap(float h){
    vec3 c0 = vec3(0.45, 0.52, 0.30);
    vec3 c1 = vec3(0.57, 0.55, 0.38); 
    vec3 c2 = vec3(0.75, 0.71, 0.48); 
    vec3 c3 = vec3(0.75, 0.71, 0.48); 
    vec3 c4 = vec3(0.85, 0.80, 0.59);  
    vec3 c5 = vec3(0.97, 0.89, 0.71); 
    vec3 c6 = vec3(0.98, 0.85, 0.66);
    vec3 c7 = vec3(0.90, 0.75, 0.57); 
    vec3 c8 = vec3(0.85, 0.70, 0.55); 
    vec3 c9 = vec3(0.82, 0.65, 0.53); 
    vec3 c10 = vec3(0.57, 0.40, 0.34);
    
    vec3 c_;
    
    c_ = mix(c0, c1, smoothstep(0./10., 1./10., h));
    c_ = mix(c_, c2, smoothstep(1./10., 2./10., h));
    c_ = mix(c_, c3, smoothstep(2./10., 3./10., h));
    c_ = mix(c_, c4, smoothstep(3./10., 4./10., h));
    c_ = mix(c_, c5, smoothstep(4./10., 5./10., h));
    c_ = mix(c_, c6, smoothstep(5./10., 6./10., h));
    c_ = mix(c_, c7, smoothstep(6./10., 7./10., h));
    c_ = mix(c_, c8, smoothstep(7./10., 8./10., h));
    c_ = mix(c_, c9, smoothstep(8./10., 9./10., h));
    c_ = mix(c_, c10, smoothstep(9./10., 10./10., h));
    
    return c_;
}



vec3 hillshading(vec3 local_normal, float altitude)
{
	mat3 tbn = mat3(normalize(TG), normalize(cross(TG,NO)), normalize(NO));
	vec3 normal = tbn*local_normal;

    vec3 light = normalize(vec3(1., .5, 1.5)); //normalize(vec3(1000.0, 2500.0, 1000.0)-PV); // light direction

	float s = max(0.0, dot(normal , light));
    s = .4 * (1.+s);
    s *= s;
    s *= s;

    // normalizd direction
    float t = dot(normal.xy, normalize(vec2(1., 1.)));
    t = 0.5 * (1.+t);

    // combined colors
    vec3 c_alt = colormap(altitude);// hill_shading_color(altitude, dot(local_normal, normalize(NO)));
    vec3 c_norm = vec3(s) * mix(vec3(.65, .75, .85), vec3(1., .95, .8), t);
    
    vec3 c = c_norm + c_alt - vec3(.5);

	//c = pow(c, vec3(1.0 / 2.2)); // correction gamma
	return 0.9*c;
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



