import Vue from 'vue'
import Router from 'vue-router'
import Main from '@/views/Main'
import CreateMeetingContent from '@/components/CreateMeetingContent'
import QueryMeetingContent from '@/components/QueryMeetingContent'
import PageFooter from '@/components/PageFooter'
import MultiPeer from '@/views/MultiPeer'
import PeerToPeer from '@/views/PeerToPeer'
import single from '@/views/single'
import PttView from '@/views/PttView'


Vue.use(Router);

export default new Router({
  routes: [
    {
        path: '/',
        redirect: '/create'
    },
    {
      path: '/create',
      name: 'Main',
      components: {
          default: Main,
          content: CreateMeetingContent,
          footer: PageFooter
      }
    },
    {
        path: '/query',
        components: {
            default: Main,
            content: QueryMeetingContent,
            footer: PageFooter
        }
    },
    {
        path: '/session/peertopeer/:Id',
        name: 'peertopeer',
        components: {
            default: PeerToPeer
        }
    },
    {
        path: '/session/multi/:Id',
        name: 'multi',
        components: {
            default: Main,
            content: PttView
        }
    },
      {
          path: '/session/multi/:groupId/:name',
          name: 'multipeer',
          components: {
              content: MultiPeer
          }
      },
    {
        path: '/session/single/:Id',
        name: 'single',
        components: {
            default: single
        }
    }
  ]
})
