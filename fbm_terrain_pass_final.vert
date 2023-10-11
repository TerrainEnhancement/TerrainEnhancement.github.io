#version 300 es

// INPUT -----------------------------
layout(location=0) in vec3 position_in;
layout(location=1) in vec3 normal_in;
layout(location=2) in vec2 texCoord_in;
layout(location=3) in vec3 tangent_in;

// OUTPUT -----------------------------
out vec2 uv;
out vec3 PV;
out vec3  NO;
out vec3  TG;

// UNIFORM -----------------------------
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;
uniform mat4 projectionMatrix;
uniform sampler2D iDN;

// MAIN PROGRAM -----------------------------
void main()
{
	uv = texCoord_in;
	vec3 displacement = position_in + texture(iDN, uv).x * normal_in;
	vec4 P4 = viewMatrix * vec4(displacement,1);
	PV = P4.xyz;
	NO = normalMatrix*normal_in;
	TG = normalMatrix*tangent_in;
	gl_Position = projectionMatrix * P4;
}
