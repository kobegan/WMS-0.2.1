<template>
    <div class="page-sidebar">
        <div class="sidebar-menugroup">
            <div class="sidebar-grouptitle">视频会话管理</div>
            <ul class="sidebar-menu">
                <router-link class="sidebar-menuitem" to="/create" tag="li">创建视频会话</router-link>
                <router-link class="sidebar-menuitem" to="/query" tag="li">查看视频会话</router-link>
            </ul>
        </div>
    </div>
</template>

<script>
    export default {
        name: 'sidebar',
        data () {
            return {}
        }
    }
</script>

<style scoped>
/*    .page-sidebar{

        width:150px;
        float:left;
    }
    .sidebar-menugroup{
        padding-bottom:10px;
    }
    .sidebar-grouptitle{
        width:100%;
        font-size:16px;
        font-weight:bold;
        cursor:pointer;
    }
    .sidebar-menu{
        list-style:none;
        padding-left:20px;
    }*/
</style>
