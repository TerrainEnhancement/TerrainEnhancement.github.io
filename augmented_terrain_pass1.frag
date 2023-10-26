#version 300 es
precision highp float;

// INPUT -----------------------------
in vec2 uv;

// OUTPUT -----------------------------

layout(location=0) out vec4 out_grad_r; // (rg:1 ba:2);
layout(location=1) out float out_fBm;
layout(location=2) out float out_displa;


// UNIFORM -----------------------------
uniform bool iBoolAugmentation;
uniform bool iBoolAmplitude;

uniform float iParamFrequence;
uniform float iParamAmplitude;

uniform float iProfilAngulaireFond;
uniform bool iBoolFBM;
uniform vec2 iProfilAngulaireMask;
uniform float iProfilAngulaireModulation;

uniform bool iBoolProfilRadial;

uniform bool iBoolRavine2;
uniform vec2 iRavine2;

uniform sampler2D iTerrainInput;
uniform sampler2D iTerrainGrad; 
uniform sampler2D iRiver;
uniform sampler2D iTerrainOriginal;


// CONSTANTE -----------------------------
#define _PI_ 3.14159265358979


// ---- Tools -------------------------------------
float rndi(int i, int j, float seed)
{
    return fract(sin(float(i)+9876.*float(j))*(12345.+seed) + cos(float(i)+6789.*float(j))*(12345.-seed));
}

vec2 hash( vec2 p )
{
    p = vec2( dot(p,vec2(127.1,311.7)),
    dot(p,vec2(269.5,183.3)) );

    return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}

float noise( in vec2 p )
{
    const float K1 = 0.366025404; // (sqrt(3)-1)/2;
    const float K2 = 0.211324865; // (3-sqrt(3))/6;

    vec2 i = floor( p + (p.x+p.y)*K1 );

    vec2 a = p - i + (i.x+i.y)*K2;
    vec2 o = step(a.yx,a.xy);
    vec2 b = a - o + K2;
    vec2 c = a - 1.0 + 2.0*K2;

    vec3 h = max( 0.5-vec3(dot(a,a), dot(b,b), dot(c,c) ), 0.0 );

    vec3 n = h*h*h*h*vec3( dot(a,hash(i+0.0)), dot(b,hash(i+o)), dot(c,hash(i+1.0)));

    return dot( n, vec3(70.0) );
}

float fBm(vec2 uv, int numOctaves )
{   
    float fbm_noise = 0.;

    float G = 0.5;
    float ampl = 1.;
    float freq = 48.;//24.;

    for( int i=0; i<numOctaves; i++ )
    {
        fbm_noise += ampl*noise(freq*uv);
        freq *= 2.0;
        ampl *= G;
    }
    return fbm_noise;
}

float gaussian(float x, float size){
    return exp(-(x*x)/(2.*size*size));
}





// ---- Gabor noise -------------------------------------
mat3 gabor(vec2 position, vec2 offset, vec2 direction, float freq, float kernel_size)
{
    // gaussian
    float gauss = gaussian((position-offset).x, kernel_size)*gaussian((position-offset).y, kernel_size);
    
    // complexe harmonic 
    float cosinus = cos(2.*_PI_*freq*dot((position-offset), direction)); // real part
    float sinus = sin(2.*_PI_*freq*dot((position-offset), direction)); // imaginary part

    // complexe derivation
    vec2 d_cos = (offset-position)/(kernel_size*kernel_size) * cosinus - 2.*_PI_*freq*direction * sinus; // real part
    vec2 d_sin = (offset-position)/(kernel_size*kernel_size) * sinus + 2.*_PI_*freq*direction * cosinus; // imaginary part
    
    
    return gauss * mat3(vec3(cosinus, d_cos), vec3(sinus, d_sin), vec3(0.));
}


mat3 Gabor_noise(vec2 uv, int nb_kernel, float freq, float freq_spread, float omega, float omega_spread, float seed, float kernel_size)
{
    mat3 noises = mat3(0.);
    mat3 gabor_noise;
    
    for (int i=0; i<nb_kernel; i++) {

        float Omega = omega + omega_spread*(0.5*rndi(i,2, seed)-0.5);
        float Freq = freq - freq_spread*rndi(i, 4, seed);
    
		vec2 pos = vec2(rndi(i,0, seed),rndi(i,1, seed));
		vec2 dir = vec2(cos(Omega), sin(Omega));
        
        gabor_noise = gabor(uv, pos, dir, Freq, kernel_size);
        
		noises += gabor_noise;
	}
    
    return noises;
}




// ---- Transfer map -------------------------------------
float angular_profil(float phi)
{
    float k = iProfilAngulaireFond;
    float alpha = 1.+2.*sqrt(k);

    float triangle = sqrt(alpha*(phi/_PI_)*(phi/_PI_) + k)-sqrt(k);

    return triangle;
}

float angular_mask(float phi)
{
    float step_l = iProfilAngulaireMask.x * _PI_;
    float step_u = iProfilAngulaireMask.y * _PI_;
    float mask = smoothstep(step_l, step_u, abs(phi));

    return mask;
}

float profil_modulation(vec2 complex_gabor, vec2 uv)
{
    float modulation = fBm(uv, 4) * angular_mask(atan(complex_gabor.y, complex_gabor.x));
    
    return modulation;
}

float radial_profil(float rho)
{
    float c = 1.;
    if(iBoolProfilRadial)
    {
        c = 24.;
        return (2./_PI_)*atan(c*rho);
    }
    return c;
}



// ---- Profil derivation -------------------------------------
float simple_transfer_map(vec2 vector_noise)
{
    // polar coordinates
    float phi = atan(vector_noise.y, vector_noise.x);
    float rho = length(vector_noise);

    // vprofiled waves
    float Phi = angular_profil(phi);
    float Rho = radial_profil(rho);

    return Rho*Phi + (1.-Rho)/2.;
}


vec2 grad_H(vec2 xy)
{
    float h = 0.001;

    float p_xph = simple_transfer_map(xy + vec2(h, 0.));
    float p_xmh = simple_transfer_map(xy - vec2(h, 0.));

    float p_yph = simple_transfer_map(xy + vec2(0., h));
    float p_ymh = simple_transfer_map(xy - vec2(0., h));

    float dPdx = (p_xph - p_xmh)/(2.*h);
    float dPdy = (p_yph - p_ymh)/(2.*h);

    return vec2(dPdx, dPdy);
}



// ---- Control maps -------------------------------------
float orientation_map(vec2 gradTerrain)
{
    float orientation = atan(gradTerrain.y, gradTerrain.x) + _PI_/2.;
    return orientation;
}

float amplitude_map(float facteur, vec2 uv, sampler2D champ)
{
    float height = texture(champ, uv).x;
    return facteur*height;
}


// MAIN PROGRAM -----------------------------
void main()
{
    // initial terrain gradient
    vec2 gradTerrain = texture(iTerrainGrad,uv).xy;

    // noise parameters
    float frequence = iParamFrequence;
    float amplitude = iParamAmplitude;
    float orientation = orientation_map(gradTerrain);

    // storing for fbo output
    mat3 disp_noise;
    vec2 grad_ravine = vec2(0.0,0.0);
    float ravine_n1 = 0.0;
    float ravine_n2 = 0.0;
    float disp_supp = 0.0;
    float tmp_fBm = 0.0;
	vec4 tmp_grad_r = vec4(0.);

    // possible to add random in frequence and orientation
    float freq_spread = 0.0;
    float omega_spread = 0.0;

    // sparse convolution parameters
    float seed = 0.624;
    float kernel_size = 1./(2.*frequence);
    int nb_kernel = int(10./kernel_size); 


    // terrain to enhance
    float AmplTerrain = amplitude_map(1., uv, iRiver);
    float InputTerrain = texture(iTerrainInput, uv).x * AmplTerrain + texture(iTerrainOriginal, uv).x * (1.-AmplTerrain);


	
    // comput details (if display)
    if(iBoolAugmentation)
    {

        if(iBoolAmplitude)
        {
            amplitude = amplitude_map(iParamAmplitude, uv, iRiver);
        }

        // noise generation
        disp_noise = Gabor_noise(uv, nb_kernel, frequence, freq_spread, orientation, omega_spread, seed, kernel_size);
        vec2 complex_gabor = vec2(disp_noise[0].x, disp_noise[1].x);
        
        // noise derivation
        mat2 Jacobienne_gabor = mat2(disp_noise[0].yz, disp_noise[1].yz); 
        grad_ravine = Jacobienne_gabor * grad_H(complex_gabor);
        tmp_grad_r.rg = amplitude * grad_ravine;

        // profiled waves
        ravine_n1 = amplitude * simple_transfer_map(complex_gabor);
        disp_supp += ravine_n1;


        // fBm on crest
        if(iBoolFBM)
        {
            tmp_fBm = amplitude * iProfilAngulaireModulation * profil_modulation(complex_gabor, uv);
            disp_supp += tmp_fBm;
        }


        // second level of detail (cascading patterns)
        if(iBoolRavine2)
        {
            // enhanced terrain gradient
            gradTerrain = gradTerrain+tmp_grad_r.rg;

            // noies parameters
            frequence *= iRavine2.y;
            orientation = orientation_map(gradTerrain);
            amplitude = iRavine2.x * ravine_n1;

            // sparse convolution parameters
            float seed = 0.246;

            // noise generation
            disp_noise = Gabor_noise(uv, nb_kernel, frequence, freq_spread, orientation, omega_spread, seed, kernel_size);
            complex_gabor = vec2(disp_noise[0].x, disp_noise[1].x);

            // noise derivation
            Jacobienne_gabor = mat2(disp_noise[0].yz, disp_noise[1].yz); 
            grad_ravine = Jacobienne_gabor * grad_H(complex_gabor);
            tmp_grad_r.ba = amplitude * grad_ravine; 

            // profiled waves
            ravine_n2 = amplitude * simple_transfer_map(complex_gabor);
            disp_supp += ravine_n2;
        }
    }

 
	out_grad_r = tmp_grad_r; // out location = 0
	out_fBm = tmp_fBm;       // out location = 1
    out_displa = InputTerrain + disp_supp;  // out location = 2

}
